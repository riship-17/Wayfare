import { Router } from 'express';
import { z } from 'zod';
import { EID_STATUSES, dubaiDateString, eidStatusSchema, newlyUnlocked, patchMeSchema } from '@wayfare/shared';
import { env } from '../env';
import { HttpError, notFound, parse } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { Budget, Institution, Listing, UserTask } from '../models';
import { contextFor, journeyFor, taskStatusesFor, templatesFor } from '../services/journey';
import { serializeUser } from '../services/serialize';

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.patch('/', async (req, res) => {
  const input = parse(patchMeSchema, req.body);
  const user = req.user!;
  if (input.institutionId && !(await Institution.exists({ _id: input.institutionId }))) throw notFound('That university');
  if (input.chosenListingId) {
    const l = await Listing.findById(input.chosenListingId).lean();
    if (!l) throw notFound('That place');
  }
  const { arrivalDate, ...rest } = input;
  user.set(rest);
  if (arrivalDate) user.arrivalDate = new Date(`${arrivalDate}T00:00:00Z`);
  if (input.homeCurrency) await Budget.updateOne({ userId: user._id }, { homeCurrency: input.homeCurrency });
  await user.save();
  res.json({ user: serializeUser(user) });
});

meRouter.patch('/eid-status', async (req, res) => {
  const { status } = parse(eidStatusSchema, req.body);
  const user = req.user!;
  const [templates, statuses] = await Promise.all([templatesFor(user.institutionId), taskStatusesFor(user._id)]);
  const before = contextFor(user, statuses);
  user.eidStatus = status;
  user.eidStatusUpdatedAt = new Date();
  await user.save();
  const unlocked = newlyUnlocked(templates, before, contextFor(user, statuses));
  res.json({ user: serializeUser(user), unlocked });
});

meRouter.post('/saved-listings/:id', async (req, res) => {
  const user = req.user!;
  const id = req.params.id;
  if (!(await Listing.exists({ _id: id }))) throw notFound('That place');
  const has = user.savedListingIds.some((x) => String(x) === id);
  if (has) user.savedListingIds = user.savedListingIds.filter((x) => String(x) !== id) as never;
  else user.savedListingIds.push(id as never);
  await user.save();
  res.json({ saved: !has, user: serializeUser(user) });
});

/** Presenter control for the stand demo. Only for the demo account and only in demo mode. */
const demoSchema = z.object({
  arrivalOffsetDays: z.number().int().min(-200).max(200).optional(),
  eidStatus: z.enum(EID_STATUSES).optional(),
  reset: z.boolean().optional(),
});

meRouter.post('/demo-controls', async (req, res) => {
  const user = req.user!;
  if (!env.DEMO_MODE || !user.isDemo) throw new HttpError(404, 'not_found', 'Presenter controls are only for the demo account.');
  const input = parse(demoSchema, req.body);
  const [templates, statuses] = await Promise.all([templatesFor(user.institutionId), taskStatusesFor(user._id)]);
  const before = contextFor(user, statuses);
  if (input.reset) {
    await UserTask.deleteMany({ userId: user._id });
    await Budget.deleteOne({ userId: user._id });
    user.eidStatus = 'not_started';
    user.arrivalDate = new Date(`${dubaiDateString(new Date(), 12)}T00:00:00Z`);
    user.chosenListingId = null;
    user.savedListingIds = [] as never;
  }
  if (input.arrivalOffsetDays !== undefined) {
    // Offset is days from today to arrival: 0 means arriving today, -10 means arrived 10 days ago.
    user.arrivalDate = new Date(`${dubaiDateString(new Date(), input.arrivalOffsetDays)}T00:00:00Z`);
  }
  if (input.eidStatus) {
    user.eidStatus = input.eidStatus;
    user.eidStatusUpdatedAt = new Date();
  }
  await user.save();
  const unlocked = input.reset ? [] : newlyUnlocked(templates, before, contextFor(user, input.reset ? {} : statuses));
  res.json({ user: serializeUser(user), unlocked, journey: await journeyFor(user) });
});
