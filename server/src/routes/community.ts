import { Router } from 'express';
import { brokerReportSchema, joinGroupSchema, postSchema, type ApiEvent, type ApiGroup } from '@wayfare/shared';
import { HttpError, notFound, parse } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { reportLimiter, writeLimiter } from '../middleware/rateLimits';
import { BrokerReport, Event, Group, Institution, Listing, User } from '../models';

export const communityRouter = Router();
communityRouter.use(['/groups', '/events', '/broker-reports'], requireAuth);

const isPlaceholder = (d: string) => !d || d.startsWith('{{');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function groupJson(g: any, userId: string, domain: string | null): Promise<ApiGroup> {
  const joined = g.memberIds.some((m: unknown) => String(m) === userId);
  const authorIds = [...new Set(g.posts.map((p: { authorId: unknown }) => String(p.authorId)))];
  const authors = await User.find({ _id: { $in: authorIds } }).select('name role').lean();
  const nameOf = new Map(authors.map((a) => [String(a._id), a.role === 'student' ? a.name.split(' ')[0] : a.name]));
  return {
    id: String(g._id),
    institutionId: String(g.institutionId),
    name: g.name,
    kind: g.kind,
    description: g.description,
    memberCount: g.memberIds.length,
    joined,
    requiresDomain: g.kind === 'university' ? domain : null,
    posts: joined
      ? [...g.posts]
          .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
          .map((p) => ({
            id: String(p._id),
            authorName: nameOf.get(String(p.authorId)) ?? 'Member',
            body: p.body,
            createdAt: new Date(p.createdAt).toISOString(),
            reported: p.reported,
            official: p.official,
          }))
      : [],
  };
}

communityRouter.get('/groups', async (req, res) => {
  const user = req.user!;
  if (!user.institutionId) return res.json({ groups: [] });
  const inst = await Institution.findById(user.institutionId).lean();
  const domain = inst?.emailDomains?.find((d) => !isPlaceholder(d)) ?? null;
  const groups = await Group.find({
    institutionId: user.institutionId,
    $or: [{ kind: 'university' }, { kind: 'interest' }, { kind: 'home_country', country: user.homeCountry }],
  }).lean();
  res.json({ groups: await Promise.all(groups.map((g) => groupJson(g, String(user._id), domain))) });
});

communityRouter.post('/groups/:id/join', writeLimiter, async (req, res) => {
  const user = req.user!;
  const { email } = parse(joinGroupSchema, req.body ?? {});
  const g = await Group.findById(req.params.id);
  if (!g || String(g.institutionId) !== String(user.institutionId)) throw notFound('That group');
  const inst = await Institution.findById(g.institutionId).lean();
  const domains = (inst?.emailDomains ?? []).filter((d) => !isPlaceholder(d));
  if (g.kind === 'university' && domains.length && !user.isDemo) {
    const candidate = (email ?? user.email).toLowerCase();
    if (!domains.some((d) => candidate.endsWith(`@${d.toLowerCase()}`))) {
      throw new HttpError(403, 'domain_required', `Use your university email ending in @${domains[0]} to join.`, { email: `Use an email ending in @${domains[0]}` });
    }
  }
  if (g.kind === 'home_country' && g.get('country') !== user.homeCountry) throw notFound('That group');
  if (!g.memberIds.some((m) => String(m) === String(user._id))) {
    g.memberIds.push(user._id);
    await g.save();
  }
  res.json({ group: await groupJson(g.toObject(), String(user._id), domains[0] ?? null) });
});

communityRouter.post('/groups/:id/posts', writeLimiter, async (req, res) => {
  const user = req.user!;
  const { body } = parse(postSchema, req.body);
  const g = await Group.findById(req.params.id);
  if (!g || !g.memberIds.some((m) => String(m) === String(user._id))) throw notFound('That group');
  g.posts.push({ authorId: user._id, body, official: user.role !== 'student' } as never);
  await g.save();
  res.status(201).json({ group: await groupJson(g.toObject(), String(user._id), null) });
});

communityRouter.post('/groups/:id/posts/:postId/report', reportLimiter, async (req, res) => {
  const user = req.user!;
  const g = await Group.findById(req.params.id);
  const post = g?.posts.id(String(req.params.postId));
  if (!g || !post) throw notFound('That post');
  post.reported = true;
  if (!post.reportedBy.some((x) => String(x) === String(user._id))) post.reportedBy.push(user._id);
  await g.save();
  res.json({ ok: true });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function eventJson(e: any, userId?: string): ApiEvent {
  return {
    id: String(e._id),
    institutionId: String(e.institutionId),
    title: e.title,
    startsAt: new Date(e.startsAt).toISOString(),
    place: e.place,
    description: e.description,
    rsvpCount: e.rsvpUserIds.length,
    going: userId ? e.rsvpUserIds.some((u: unknown) => String(u) === userId) : false,
  };
}

communityRouter.get('/events', async (req, res) => {
  const user = req.user!;
  if (!user.institutionId) return res.json({ events: [] });
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const events = await Event.find({ institutionId: user.institutionId, startsAt: { $gte: since } }).sort({ startsAt: 1 }).limit(20).lean();
  res.json({ events: events.map((e) => eventJson(e, String(user._id))) });
});

communityRouter.post('/events/:id/rsvp', writeLimiter, async (req, res) => {
  const user = req.user!;
  const e = await Event.findById(req.params.id);
  if (!e || String(e.institutionId) !== String(user.institutionId)) throw notFound('That event');
  const going = e.rsvpUserIds.some((u) => String(u) === String(user._id));
  if (going) e.rsvpUserIds = e.rsvpUserIds.filter((u) => String(u) !== String(user._id)) as never;
  else e.rsvpUserIds.push(user._id);
  await e.save();
  res.json({ event: eventJson(e.toObject(), String(user._id)) });
});

communityRouter.post('/broker-reports', reportLimiter, async (req, res) => {
  const user = req.user!;
  const input = parse(brokerReportSchema, req.body);
  let institutionId = user.institutionId;
  if (input.listingId) {
    const l = await Listing.findById(input.listingId).select('institutionIds').lean();
    if (!l) throw notFound('That place');
    institutionId = (l.institutionIds?.[0] as never) ?? institutionId;
  }
  const r = await BrokerReport.create({ reporterId: user._id, institutionId, ...input });
  res.status(201).json({ id: String(r._id) });
});
