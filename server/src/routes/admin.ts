import { Router } from 'express';
import {
  brokerReportPatchSchema,
  eventSchema,
  mergeTemplates,
  taskTemplatePatchSchema,
  taskTemplateSchema,
  verificationSchema,
  VERIFICATION_STATUSES,
  type ApiBrokerReport,
  type TaskTemplateLike,
} from '@wayfare/shared';
import { z } from 'zod';
import { HttpError, forbidden, notFound, parse } from '../lib/errors';
import { requireRole } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimits';
import { BrokerReport, Event, Group, Institution, Listing, TaskTemplate, ViewingRequest } from '../models';
import { serializeListing } from '../services/serialize';
import { getNetwork } from '../services/transit';
import { eventJson } from './community';

export const adminRouter = Router();
adminRouter.use(requireRole('institution_admin', 'platform_admin'));

/** The institution this admin acts for. Platform admins may pass ?institution=<id>. */
function scopeOf(req: Parameters<Parameters<typeof adminRouter.get>[1]>[0]): string {
  const user = req.user!;
  if (user.role === 'platform_admin' && typeof req.query.institution === 'string') return req.query.institution;
  if (!user.institutionId) throw forbidden();
  return String(user.institutionId);
}

adminRouter.get('/overview', async (req, res) => {
  const inst = scopeOf(req);
  const institution = await Institution.findById(inst).lean();
  const [pending, verified, rejected, reports, events] = await Promise.all([
    Listing.countDocuments({ institutionIds: inst, 'verification.status': 'pending' }),
    Listing.countDocuments({ institutionIds: inst, 'verification.status': 'verified' }),
    Listing.countDocuments({ institutionIds: inst, 'verification.status': 'rejected' }),
    BrokerReport.countDocuments({ institutionId: inst, status: 'new' }),
    Event.countDocuments({ institutionId: inst, startsAt: { $gte: new Date() } }),
  ]);
  res.json({ institution: { id: inst, name: institution?.name ?? '' }, counts: { pending, verified, rejected, reports, events } });
});

// ---------- Listings verification ----------
adminRouter.get('/listings', async (req, res) => {
  const inst = scopeOf(req);
  const { status } = parse(z.object({ status: z.enum(VERIFICATION_STATUSES).optional() }), req.query);
  const rows = await Listing.find({ institutionIds: inst, ...(status ? { 'verification.status': status } : {}) }).sort({ updatedAt: -1 }).lean();
  const [net, institution, viewing] = await Promise.all([
    getNetwork(),
    Institution.findById(inst).select('name').lean(),
    ViewingRequest.aggregate([{ $match: { listingId: { $in: rows.map((r) => r._id) } } }, { $group: { _id: '$listingId', n: { $sum: 1 } } }]),
  ]);
  const counts = new Map(viewing.map((v) => [String(v._id), v.n as number]));
  res.json({
    listings: rows.map((l) => ({
      ...serializeListing(l, net?.network ?? null, institution?.name ?? null),
      // Admins see the stored prices even before verification so they can confirm them.
      roomTypes: l.roomTypes.map((r) => ({ type: r.type, priceAedMonthly: r.priceAedMonthly ?? null, depositAed: r.depositAed ?? null })),
      viewingRequests: counts.get(String(l._id)) ?? 0,
    })),
  });
});

adminRouter.patch('/listings/:id/verification', writeLimiter, async (req, res) => {
  const inst = scopeOf(req);
  const input = parse(verificationSchema, req.body);
  const l = await Listing.findOne({ _id: req.params.id, institutionIds: inst });
  if (!l) throw notFound('That listing');
  if (input.status === 'verified') {
    l.roomTypes = input.roomTypes as never;
    if (input.transit !== undefined) {
      if (input.transit && !(await getNetwork())?.network.stations.some((s) => s.stationId === input.transit!.stationId)) {
        throw new HttpError(400, 'validation_failed', 'Pick a station from the list.', { 'transit.stationId': 'Pick a station from the list' });
      }
      l.transit = (input.transit ?? null) as never;
    }
    if (input.campusDistanceKm !== undefined) l.campusDistanceKm = input.campusDistanceKm ?? null;
    if (input.area) l.area = input.area;
    l.verification = { status: 'verified', verifiedBy: req.user!._id, verifiedAt: new Date(), sourceUrl: input.sourceUrl, checkedOn: input.checkedOn, notes: input.notes ?? null } as never;
  } else {
    l.verification = { status: input.status, verifiedBy: null, verifiedAt: null, sourceUrl: l.verification?.sourceUrl ?? null, checkedOn: l.verification?.checkedOn ?? null, notes: input.notes ?? null } as never;
  }
  await l.save();
  const [net, institution] = await Promise.all([getNetwork(), Institution.findById(inst).select('name').lean()]);
  res.json({ listing: serializeListing(l.toObject(), net?.network ?? null, institution?.name ?? null) });
});

// ---------- Events ----------
adminRouter.get('/events', async (req, res) => {
  const inst = scopeOf(req);
  const events = await Event.find({ institutionId: inst }).sort({ startsAt: 1 }).lean();
  res.json({ events: events.map((e) => eventJson(e)) });
});

adminRouter.post('/events', writeLimiter, async (req, res) => {
  const inst = scopeOf(req);
  const input = parse(eventSchema, req.body);
  const e = await Event.create({ ...input, startsAt: new Date(input.startsAt), institutionId: inst, createdBy: req.user!._id });
  res.status(201).json({ event: eventJson(e.toObject()) });
});

adminRouter.put('/events/:id', writeLimiter, async (req, res) => {
  const inst = scopeOf(req);
  const input = parse(eventSchema, req.body);
  const e = await Event.findOneAndUpdate({ _id: req.params.id, institutionId: inst }, { ...input, startsAt: new Date(input.startsAt) }, { returnDocument: 'after' }).lean();
  if (!e) throw notFound('That event');
  res.json({ event: eventJson(e) });
});

adminRouter.delete('/events/:id', async (req, res) => {
  const inst = scopeOf(req);
  const r = await Event.deleteOne({ _id: req.params.id, institutionId: inst });
  if (!r.deletedCount) throw notFound('That event');
  res.status(204).end();
});

// ---------- Checklist tasks ----------
async function tasksFor(inst: string) {
  const docs = await TaskTemplate.find({ $or: [{ institutionId: null }, { institutionId: inst }] }).lean();
  const plain = docs.map((d) => ({ ...d, institutionId: d.institutionId ? String(d.institutionId) : null })) as unknown as (TaskTemplateLike & { _id: unknown })[];
  const globalKeys = new Set(plain.filter((d) => !d.institutionId).map((d) => d.key));
  return mergeTemplates(plain, inst).map((t) => ({
    key: t.key,
    phase: t.phase,
    title: t.title,
    summary: t.summary,
    steps: t.steps,
    requires: t.requires,
    bridge: t.bridge ?? null,
    where: t.where ?? null,
    costNote: t.costNote ?? null,
    officialLinks: t.officialLinks.map((l) => ({ label: l.label, url: l.url })),
    order: t.order,
    customised: !!t.institutionId && globalKeys.has(t.key),
    institutionOnly: !!t.institutionId && !globalKeys.has(t.key),
  }));
}

adminRouter.get('/tasks', async (req, res) => {
  res.json({ tasks: await tasksFor(scopeOf(req)) });
});

adminRouter.post('/tasks', writeLimiter, async (req, res) => {
  const inst = scopeOf(req);
  const input = parse(taskTemplateSchema, req.body);
  if (await TaskTemplate.exists({ key: input.key, $or: [{ institutionId: null }, { institutionId: inst }] })) {
    throw new HttpError(409, 'key_taken', 'A task with this key already exists. Edit it instead.', { key: 'This key is taken' });
  }
  await TaskTemplate.create({ ...input, institutionId: inst });
  res.status(201).json({ tasks: await tasksFor(inst) });
});

/** Editing a global task creates this institution's own copy; students of other institutions keep the original. */
adminRouter.patch('/tasks/:key', writeLimiter, async (req, res) => {
  const inst = scopeOf(req);
  const input = parse(taskTemplatePatchSchema, req.body);
  const own = await TaskTemplate.findOne({ key: String(req.params.key), institutionId: inst });
  if (own) {
    own.set(input);
    await own.save();
  } else {
    const global = await TaskTemplate.findOne({ key: String(req.params.key), institutionId: null }).lean();
    if (!global) throw notFound('That task');
    const { _id, createdAt: _c, updatedAt: _u, ...rest } = global as Record<string, unknown>;
    void _id;
    await TaskTemplate.create({ ...rest, ...input, key: String(req.params.key), institutionId: inst });
  }
  res.json({ tasks: await tasksFor(inst) });
});

/** Removes this institution's copy (reverting to the global task) or its own task. */
adminRouter.delete('/tasks/:key', async (req, res) => {
  const inst = scopeOf(req);
  const r = await TaskTemplate.deleteOne({ key: String(req.params.key), institutionId: inst });
  if (!r.deletedCount) throw notFound('That customised task');
  res.json({ tasks: await tasksFor(inst) });
});

// ---------- Broker reports and reported posts ----------
adminRouter.get('/broker-reports', async (req, res) => {
  const inst = scopeOf(req);
  const rows = await BrokerReport.find({ institutionId: inst }).sort({ status: 1, createdAt: -1 }).lean();
  const listings = await Listing.find({ _id: { $in: rows.map((r) => r.listingId).filter(Boolean) } }).select('title').lean();
  const titles = new Map(listings.map((l) => [String(l._id), l.title]));
  const reports: ApiBrokerReport[] = rows.map((r) => ({
    id: String(r._id),
    listingId: r.listingId ? String(r.listingId) : null,
    listingTitle: r.listingId ? (titles.get(String(r.listingId)) ?? null) : null,
    contact: r.contact,
    description: r.description,
    status: r.status as 'new' | 'handled',
    createdAt: new Date(r.createdAt as unknown as string).toISOString(),
  }));
  const groups = await Group.find({ institutionId: inst, 'posts.reported': true }).lean();
  const reportedPosts = groups.flatMap((g) =>
    g.posts.filter((p) => p.reported).map((p) => ({ groupId: String(g._id), groupName: g.name, postId: String(p._id), body: p.body, reports: p.reportedBy.length })),
  );
  res.json({ reports, reportedPosts });
});

adminRouter.patch('/broker-reports/:id', writeLimiter, async (req, res) => {
  const inst = scopeOf(req);
  const { status } = parse(brokerReportPatchSchema, req.body);
  const r = await BrokerReport.findOneAndUpdate({ _id: req.params.id, institutionId: inst }, { status, handledBy: status === 'handled' ? req.user!._id : null }, { returnDocument: 'after' }).lean();
  if (!r) throw notFound('That report');
  res.json({ ok: true, status: r.status });
});

adminRouter.patch('/groups/:groupId/posts/:postId', writeLimiter, async (req, res) => {
  const inst = scopeOf(req);
  const { action } = parse(z.object({ action: z.enum(['remove', 'keep']) }), req.body);
  const g = await Group.findOne({ _id: req.params.groupId, institutionId: inst });
  const post = g?.posts.id(String(req.params.postId));
  if (!g || !post) throw notFound('That post');
  if (action === 'remove') post.deleteOne();
  else {
    post.reported = false;
    post.reportedBy = [] as never;
  }
  await g.save();
  res.json({ ok: true });
});
