import { describe, expect, it } from 'vitest';
import {
  buildJourney,
  computeBattery,
  countdownLabel,
  dayIndex,
  evaluateTask,
  mergeTemplates,
  newlyUnlocked,
  phaseForDay,
  stageForPhase,
  type JourneyContext,
  type TaskTemplateLike,
} from '../src';

const t = (key: string, phase: TaskTemplateLike['phase'], requires: TaskTemplateLike['requires'] = [], order = 0, bridge?: string): TaskTemplateLike => ({
  key, phase, title: key, summary: '', steps: [], requires, officialLinks: [], order, bridge: bridge ?? null,
});

const templates: TaskTemplateLike[] = [
  t('choose-housing', 'before_arrival', ['passport'], 1),
  t('budget', 'before_arrival', [], 2),
  t('visitor-sim', 'arrival', ['passport', 'entry_permit'], 1),
  t('bank', 'initial_settlement', ['residence_issued'], 1, 'Keep using your home card for now'),
  t('register-ejari', 'initial_settlement', ['emirates_id'], 2, 'Ask your provider'),
  t('dewa', 'initial_settlement', ['ejari'], 3),
  t('resident-sim', 'initial_settlement', ['emirates_id'], 4, 'Your visitor line works meanwhile'),
  t('student-nol', 'initial_settlement', ['emirates_id', 'enrolment_letter'], 5, 'Use your Silver nol card'),
  t('community', 'adjustment', [], 1),
];

const NOW = new Date('2026-11-09T08:00:00Z'); // 12:00 in Dubai
const ctx = (over: Partial<JourneyContext> = {}): JourneyContext => ({
  arrivalDate: '2026-11-21', eidStatus: 'not_started', taskStatuses: {}, now: NOW, ...over,
});

describe('day index and phase', () => {
  it('counts days in Dubai time', () => {
    expect(dayIndex('2026-11-21', NOW)).toBe(-12);
    expect(dayIndex('2026-11-09', NOW)).toBe(0);
    // 22:00 UTC on 8 Nov is already 9 Nov in Dubai
    expect(dayIndex('2026-11-09', new Date('2026-11-08T22:00:00Z'))).toBe(0);
    expect(dayIndex('2026-11-09', new Date('2026-11-08T19:59:00Z'))).toBe(-1);
  });
  it('maps days to the four phases', () => {
    expect(phaseForDay(-1)).toBe('before_arrival');
    expect(phaseForDay(0)).toBe('arrival');
    expect(phaseForDay(6)).toBe('arrival');
    expect(phaseForDay(7)).toBe('initial_settlement');
    expect(phaseForDay(30)).toBe('initial_settlement');
    expect(phaseForDay(31)).toBe('adjustment');
  });
  it('maps phases to three stages', () => {
    expect(stageForPhase('before_arrival')).toBe('prepare');
    expect(stageForPhase('arrival')).toBe('arrive');
    expect(stageForPhase('initial_settlement')).toBe('settle');
    expect(stageForPhase('adjustment')).toBe('settle');
  });
  it('writes the countdown line', () => {
    expect(countdownLabel(-12)).toBe('12 days to go');
    expect(countdownLabel(-1)).toBe('1 day to go');
    expect(countdownLabel(0)).toBe('Day Zero in Dubai');
    expect(countdownLabel(2)).toBe('Day 2 in Dubai');
    expect(countdownLabel(15)).toBe('Week 3 in Dubai');
  });
});

describe('availability', () => {
  it('locks Emirates ID tasks until the card is received and keeps the bridge', () => {
    const task = evaluateTask(templates[4], ctx());
    expect(task.availability).toBe('locked');
    expect(task.missing).toEqual(['emirates_id']);
    expect(task.bridge).toBe('Ask your provider');
    expect(evaluateTask(templates[4], ctx({ eidStatus: 'card_received' })).availability).toBe('available');
  });
  it('unlocks banking at residence issued, before the card', () => {
    expect(evaluateTask(templates[3], ctx({ eidStatus: 'biometrics_done' })).availability).toBe('locked');
    expect(evaluateTask(templates[3], ctx({ eidStatus: 'residence_issued' })).availability).toBe('available');
  });
  it('needs the entry permit for the visitor SIM', () => {
    expect(evaluateTask(templates[2], ctx()).availability).toBe('locked');
    expect(evaluateTask(templates[2], ctx({ eidStatus: 'entry_permit_issued' })).availability).toBe('available');
  });
  it('unlocks DEWA only once Ejari is done', () => {
    const c = ctx({ eidStatus: 'card_received' });
    expect(evaluateTask(templates[5], c).availability).toBe('locked');
    expect(evaluateTask(templates[5], { ...c, taskStatuses: { 'register-ejari': 'done' } }).availability).toBe('available');
  });
  it('lists the tasks a status change unlocks', () => {
    const unlocked = newlyUnlocked(templates, ctx({ eidStatus: 'residence_issued' }), ctx({ eidStatus: 'card_received' }));
    expect(unlocked.sort()).toEqual(['register-ejari', 'resident-sim', 'student-nol']);
  });
  it('does not count tasks already done as unlocked', () => {
    const before = ctx({ eidStatus: 'residence_issued', taskStatuses: { 'resident-sim': 'done' } });
    const after = { ...before, eidStatus: 'card_received' as const };
    expect(newlyUnlocked(templates, before, after)).not.toContain('resident-sim');
  });
});

describe('battery', () => {
  it('is the average of four phase cells', () => {
    const b = computeBattery([
      { phase: 'before_arrival', status: 'done' },
      { phase: 'before_arrival', status: 'todo' },
      { phase: 'arrival', status: 'todo' },
      { phase: 'initial_settlement', status: 'todo' },
      { phase: 'adjustment', status: 'done' },
    ]);
    expect(b.cells.map((c) => c.value)).toEqual([0.5, 0, 0, 1]);
    expect(b.percent).toBe(38);
  });
  it('ignores skipped tasks', () => {
    const b = computeBattery([
      { phase: 'before_arrival', status: 'done' },
      { phase: 'before_arrival', status: 'skipped' },
      { phase: 'arrival', status: 'done' },
      { phase: 'initial_settlement', status: 'done' },
      { phase: 'adjustment', status: 'done' },
    ]);
    expect(b.percent).toBe(100);
  });
  it('starts at 0 for a new student', () => {
    expect(buildJourney(templates, ctx()).battery.percent).toBe(0);
  });
});

describe('journey', () => {
  it('gives the demo student 12 days to go, Prepare, and one next step', () => {
    const j = buildJourney(templates, ctx());
    expect(j.countdown).toBe('12 days to go');
    expect(j.phase).toBe('before_arrival');
    expect(j.stage).toBe('prepare');
    expect(j.nextStepKey).toBe('choose-housing');
  });
  it('moves the next step forward as tasks are done', () => {
    const j = buildJourney(templates, ctx({ taskStatuses: { 'choose-housing': 'done' } }));
    expect(j.nextStepKey).toBe('budget');
  });
  it('suggests overdue earlier tasks before current ones', () => {
    const j = buildJourney(templates, ctx({ arrivalDate: '2026-11-01', eidStatus: 'card_received' }));
    expect(j.phase).toBe('initial_settlement');
    expect(j.nextStepKey).toBe('choose-housing');
  });
  it('lets an institution override a global task by key', () => {
    const merged = mergeTemplates(
      [
        { ...t('budget', 'before_arrival'), institutionId: null, title: 'Global' },
        { ...t('budget', 'before_arrival'), institutionId: 'hw', title: 'Heriot-Watt' },
        { ...t('budget', 'before_arrival'), institutionId: 'other', title: 'Other' },
      ],
      'hw',
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('Heriot-Watt');
  });
});
