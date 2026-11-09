import { Router } from 'express';
import { listingQuerySchema, viewingRequestSchema } from '@wayfare/shared';
import { notFound, parse } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimits';
import { Institution, Listing, ViewingRequest } from '../models';
import { serializeListing } from '../services/serialize';
import { getNetwork } from '../services/transit';

export const listingsRouter = Router();
listingsRouter.use(requireAuth);

const minPrice = (l: { roomTypes: { priceAedMonthly: number | null }[] }) =>
  Math.min(...l.roomTypes.map((r) => r.priceAedMonthly ?? Infinity));

export async function institutionNames(): Promise<Map<string, string>> {
  const all = await Institution.find().select('name').lean();
  return new Map(all.map((i) => [String(i._id), i.name]));
}

listingsRouter.get('/', async (req, res) => {
  const q = parse(listingQuerySchema, req.query);
  let institutionId: unknown = req.user!.institutionId;
  if (q.institution) {
    const inst = await Institution.findOne({ slug: q.institution }).select('_id').lean();
    if (!inst) throw notFound('That university');
    institutionId = inst._id;
  }
  const filter: Record<string, unknown> = { 'verification.status': { $in: ['pending', 'verified'] } };
  if (institutionId) filter.institutionIds = institutionId;
  if (q.womenOnly === 'true') filter.womenOnly = true;
  if (q.roomType) filter['roomTypes.type'] = q.roomType;
  if (q.nearTransit === 'true') filter['transit.walkMinutesApprox'] = { $lte: 15 };
  if (q.billsIncluded === 'true') filter['billsIncluded.0'] = { $exists: true };

  let rows = await Listing.find(filter).lean();
  // Price filters only apply to verified prices. Unverified places have no price to compare.
  if (q.maxPriceAed) rows = rows.filter((l) => l.verification?.status === 'verified' && minPrice(l as never) <= q.maxPriceAed!);
  const sort = q.sort ?? 'transit';
  rows.sort((a, b) => {
    const verified = Number(b.verification?.status === 'verified') - Number(a.verification?.status === 'verified');
    if (verified) return verified;
    if (sort === 'price') return minPrice(a as never) - minPrice(b as never);
    if (sort === 'campus') return (a.campusDistanceKm ?? Infinity) - (b.campusDistanceKm ?? Infinity);
    return (a.transit?.walkMinutesApprox ?? Infinity) - (b.transit?.walkMinutesApprox ?? Infinity);
  });
  const [net, names] = await Promise.all([getNetwork(), institutionNames()]);
  res.json({
    listings: rows.map((l) => serializeListing(l, net?.network ?? null, names.get(String(l.institutionIds?.[0])) ?? null)),
  });
});

listingsRouter.get('/:id', async (req, res) => {
  const l = await Listing.findById(req.params.id).lean();
  if (!l || l.verification?.status === 'rejected') throw notFound('That place');
  const [net, names] = await Promise.all([getNetwork(), institutionNames()]);
  res.json({ listing: serializeListing(l, net?.network ?? null, names.get(String(l.institutionIds?.[0])) ?? null) });
});

listingsRouter.post('/:id/viewing-requests', writeLimiter, async (req, res) => {
  const input = parse(viewingRequestSchema, req.body ?? {});
  const l = await Listing.findById(req.params.id).select('providerName').lean();
  if (!l) throw notFound('That place');
  const existing = await ViewingRequest.findOne({ userId: req.user!._id, listingId: l._id });
  if (!existing) await ViewingRequest.create({ userId: req.user!._id, listingId: l._id, ...input });
  res.status(201).json({ ok: true, providerName: l.providerName, alreadyRequested: !!existing });
});
