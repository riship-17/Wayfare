import {
  buildJourney,
  dubaiDateString,
  mergeTemplates,
  newlyUnlocked,
  type ApiJourney,
  type JourneyContext,
  type TaskStatus,
  type TaskTemplateLike,
} from '@wayfare/shared';
import type { Types } from 'mongoose';
import { TaskTemplate, UserTask, type UserDoc } from '../models';

// Pure Day Zero logic lives in @wayfare/shared so the offline client runs the same code.
// It is unit tested in packages/shared/test/journey.test.ts. This module loads data for it.
export { buildJourney, newlyUnlocked, mergeTemplates } from '@wayfare/shared';

export async function templatesFor(institutionId: Types.ObjectId | string | null | undefined): Promise<TaskTemplateLike[]> {
  const docs = await TaskTemplate.find(institutionId ? { $or: [{ institutionId: null }, { institutionId }] } : { institutionId: null }).lean();
  const plain = docs.map((d) => ({
    key: d.key,
    phase: d.phase,
    title: d.title,
    summary: d.summary,
    steps: d.steps,
    requires: d.requires,
    bridge: d.bridge ?? null,
    where: d.where ?? null,
    costNote: d.costNote ?? null,
    officialLinks: d.officialLinks.map((l) => ({ label: l.label, url: l.url })),
    costItemKeys: d.costItemKeys,
    institutionId: d.institutionId ? String(d.institutionId) : null,
    order: d.order,
  })) as TaskTemplateLike[];
  return mergeTemplates(plain, institutionId ? String(institutionId) : null);
}

export async function taskStatusesFor(userId: Types.ObjectId): Promise<Record<string, TaskStatus>> {
  const rows = await UserTask.find({ userId }).lean();
  return Object.fromEntries(rows.map((r) => [r.key, r.status as TaskStatus]));
}

export function arrivalOf(user: UserDoc): string {
  return user.arrivalDate ? user.arrivalDate.toISOString().slice(0, 10) : dubaiDateString(new Date(), 30);
}

export function contextFor(user: UserDoc, taskStatuses: Record<string, TaskStatus>): JourneyContext {
  return { arrivalDate: arrivalOf(user), eidStatus: user.eidStatus, taskStatuses };
}

export async function journeyFor(user: UserDoc): Promise<ApiJourney> {
  const [templates, statuses] = await Promise.all([templatesFor(user.institutionId), taskStatusesFor(user._id)]);
  const journey = buildJourney(templates, contextFor(user, statuses));
  return { ...journey, templates, eidStatus: user.eidStatus, arrivalDate: arrivalOf(user) };
}
