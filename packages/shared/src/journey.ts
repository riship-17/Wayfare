import {
  EID_STATUSES,
  PHASES,
  PHASE_STAGE,
  type EidStatus,
  type Phase,
  type Requirement,
  type Stage,
  type TaskStatus,
} from './enums';
import { dayIndex } from './dates';

export interface OfficialLink {
  label: string;
  url: string;
}

export interface TaskTemplateLike {
  key: string;
  phase: Phase;
  title: string;
  summary: string;
  steps: string[];
  requires: Requirement[];
  bridge?: string | null;
  where?: string | null;
  costNote?: string | null;
  officialLinks: OfficialLink[];
  costItemKeys?: string[];
  institutionId?: string | null;
  order: number;
}

export interface JourneyContext {
  arrivalDate: string | Date;
  eidStatus: EidStatus;
  /** Status per task key. Missing keys are `todo`. */
  taskStatuses: Record<string, TaskStatus>;
  now?: Date;
}

export type Availability = 'available' | 'locked';

export interface JourneyTask extends TaskTemplateLike {
  status: TaskStatus;
  availability: Availability;
  /** Requirements that are not met yet. Empty when available. */
  missing: Requirement[];
}

export interface BatteryCell {
  phase: Phase;
  done: number;
  applicable: number;
  /** 0 to 1 */
  value: number;
}

export interface Battery {
  cells: BatteryCell[];
  /** 0 to 100, average of the four cells */
  percent: number;
}

export interface Journey {
  dayIndex: number;
  phase: Phase;
  stage: Stage;
  countdown: string;
  battery: Battery;
  tasks: JourneyTask[];
  nextStepKey: string | null;
}

/** The key of the Ejari task. DEWA and other tasks that need `ejari` unlock when it is done. */
export const EJARI_TASK_KEY = 'register-ejari';

export function eidIndex(status: EidStatus): number {
  return EID_STATUSES.indexOf(status);
}

export function phaseForDay(day: number): Phase {
  if (day < 0) return 'before_arrival';
  if (day <= 6) return 'arrival';
  if (day <= 30) return 'initial_settlement';
  return 'adjustment';
}

export function stageForPhase(phase: Phase): Stage {
  return PHASE_STAGE[phase];
}

export function phasesForStage(stage: Stage): Phase[] {
  return PHASES.filter((p) => PHASE_STAGE[p] === stage);
}

/** "12 days to go", "Day 2 in Dubai", "Week 3 in Dubai" */
export function countdownLabel(day: number): string {
  if (day === -1) return '1 day to go';
  if (day < 0) return `${-day} days to go`;
  if (day === 0) return 'Day Zero in Dubai';
  if (day <= 6) return `Day ${day} in Dubai`;
  return `Week ${Math.floor(day / 7) + 1} in Dubai`;
}

export function requirementMet(req: Requirement, ctx: JourneyContext): boolean {
  const eid = eidIndex(ctx.eidStatus);
  switch (req) {
    case 'passport':
    case 'enrolment_letter':
      // Every student on Wayfare has a passport and an offer or enrolment letter.
      return true;
    case 'entry_permit':
      return eid >= eidIndex('entry_permit_issued');
    case 'residence_issued':
      return eid >= eidIndex('residence_issued');
    case 'emirates_id':
      return eid >= eidIndex('card_received');
    case 'ejari':
      return ctx.taskStatuses[EJARI_TASK_KEY] === 'done';
  }
}

export function evaluateTask(template: TaskTemplateLike, ctx: JourneyContext): JourneyTask {
  const missing = template.requires.filter((r) => !requirementMet(r, ctx));
  return {
    ...template,
    status: ctx.taskStatuses[template.key] ?? 'todo',
    availability: missing.length === 0 ? 'available' : 'locked',
    missing,
  };
}

/** Each cell = completed / applicable tasks of that phase. Skipped tasks are not applicable. */
export function computeBattery(tasks: Pick<JourneyTask, 'phase' | 'status'>[]): Battery {
  const cells = PHASES.map((phase): BatteryCell => {
    const applicable = tasks.filter((t) => t.phase === phase && t.status !== 'skipped');
    const done = applicable.filter((t) => t.status === 'done').length;
    const value = applicable.length === 0 ? 1 : done / applicable.length;
    return { phase, done, applicable: applicable.length, value };
  });
  const percent = Math.round((cells.reduce((sum, c) => sum + c.value, 0) / cells.length) * 100);
  return { cells, percent };
}

/**
 * The single highest priority task the student can do now: the earliest phase first
 * (anything overdue from earlier phases comes before the current phase), then template order.
 * Tasks from later phases are only suggested when nothing in the current or earlier phases is open.
 */
export function pickNextStep(tasks: JourneyTask[], phase: Phase): JourneyTask | null {
  const current = PHASES.indexOf(phase);
  const open = tasks
    .filter((t) => t.status === 'todo' && t.availability === 'available')
    .sort((a, b) => PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase) || a.order - b.order);
  return open.find((t) => PHASES.indexOf(t.phase) <= current) ?? open[0] ?? null;
}

export function buildJourney(templates: TaskTemplateLike[], ctx: JourneyContext): Journey {
  const day = dayIndex(ctx.arrivalDate, ctx.now ?? new Date());
  const phase = phaseForDay(day);
  const tasks = templates
    .map((t) => evaluateTask(t, ctx))
    .sort((a, b) => PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase) || a.order - b.order);
  const next = pickNextStep(tasks, phase);
  return {
    dayIndex: day,
    phase,
    stage: stageForPhase(phase),
    countdown: countdownLabel(day),
    battery: computeBattery(tasks),
    tasks,
    nextStepKey: next?.key ?? null,
  };
}

/** Keys of tasks that were locked before and are available after a context change. */
export function newlyUnlocked(
  templates: TaskTemplateLike[],
  before: JourneyContext,
  after: JourneyContext,
): string[] {
  return templates
    .filter((t) => {
      const was = evaluateTask(t, before);
      const now = evaluateTask(t, after);
      return was.availability === 'locked' && now.availability === 'available' && now.status === 'todo';
    })
    .map((t) => t.key);
}

/**
 * Institution specific templates replace global ones with the same key.
 * Pass global templates (institutionId null) and the institution's own.
 */
export function mergeTemplates<T extends TaskTemplateLike>(templates: T[], institutionId?: string | null): T[] {
  const byKey = new Map<string, T>();
  for (const t of templates) if (!t.institutionId) byKey.set(t.key, t);
  if (institutionId) {
    for (const t of templates) if (t.institutionId && String(t.institutionId) === String(institutionId)) byKey.set(t.key, t);
  }
  return [...byKey.values()];
}
