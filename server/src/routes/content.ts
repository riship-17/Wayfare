import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import type { Types } from 'mongoose';
import { budgetPutSchema, type ApiBudget, type ApiCostItem, type ApiServiceGuide, type ApiShareView } from '@wayfare/shared';
import { HttpError, notFound, parse } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimits';
import { Budget, CostItem, Institution, Listing, ServiceGuide, User } from '../models';
import { journeyFor } from '../services/journey';
import { getRates } from '../services/rates';
import { serializeInstitution, serializeListing } from '../services/serialize';
import { getNetwork } from '../services/transit';
import { institutionNames } from './listings';

export const contentRouter = Router();

// ---------- Institutions (public: set up searches them before the profile exists) ----------
contentRouter.get('/institutions', async (_req, res) => {
  const all = await Institution.find().sort({ name: 1 }).lean();
  res.json({ institutions: all.map(serializeInstitution) });
});

contentRouter.get('/institutions/:slug', async (req, res) => {
  const i = await Institution.findOne({ slug: req.params.slug }).lean();
  if (!i) throw notFound('That university');
  res.json({ institution: serializeInstitution(i) });
});

// ---------- Essentials and costs (public, also exported for offline) ----------
export async function essentials(): Promise<ApiServiceGuide[]> {
  const rows = await ServiceGuide.find().sort({ order: 1 }).lean();
  return rows.map((s) => ({
    key: s.key,
    title: s.title,
    summary: s.summary,
    icon: s.icon,
    dayZeroReady: s.dayZeroReady,
    needs: s.needs,
    steps: s.steps,
    bridge: s.bridge ?? null,
    links: s.links.map((l) => ({ label: l.label, url: l.url })),
    source: { label: s.source.label, url: s.source.url, checkedOn: s.source.checkedOn },
  })) as ApiServiceGuide[];
}

async function costs(): Promise<ApiCostItem[]> {
  const rows = await CostItem.find().sort({ order: 1 }).lean();
  return rows.map((c) => ({
    key: c.key,
    label: c.label,
    timing: c.timing,
    amountAed: c.amountAed ?? null,
    amountNote: c.amountNote ?? null,
    needsEmiratesId: c.needsEmiratesId,
    fromListing: (c.fromListing as ApiCostItem['fromListing']) ?? null,
    source: c.source ? { label: c.source.label, url: c.source.url, checkedOn: c.source.checkedOn } : null,
  }));
}

contentRouter.get('/essentials', async (_req, res) => {
  res.json({ services: await essentials() });
});

contentRouter.get('/costs', async (_req, res) => {
  res.json({ costs: await costs() });
});

// ---------- Rates (server side only; the client never calls the provider) ----------
contentRouter.get('/rates', async (_req, res) => {
  const rates = await getRates();
  if (!rates) throw new HttpError(503, 'rates_unavailable', 'Exchange rates are not available right now. Amounts show in AED.');
  res.setHeader('Cache-Control', 'public, max-age=900');
  res.json({ rates });
});

// ---------- Budget ----------
function budgetJson(b: { items: { key?: string | null; amountAed?: number | null }[]; homeCurrency: string; shareToken?: string | null; shareRevokedAt?: Date | null }): ApiBudget {
  return {
    items: b.items.map((i) => ({ key: i.key ?? '', amountAed: i.amountAed ?? null })),
    homeCurrency: b.homeCurrency,
    shareToken: b.shareToken && !b.shareRevokedAt ? b.shareToken : null,
    shareActive: !!b.shareToken && !b.shareRevokedAt,
  };
}

async function budgetFor(userId: Types.ObjectId, homeCurrency: string) {
  return (await Budget.findOne({ userId })) ?? (await Budget.create({ userId, items: [], homeCurrency }));
}

contentRouter.get('/budget/me', requireAuth, async (req, res) => {
  const b = await budgetFor(req.user!._id, req.user!.homeCurrency);
  res.json({ budget: budgetJson(b) });
});

contentRouter.put('/budget/me', requireAuth, writeLimiter, async (req, res) => {
  const { items } = parse(budgetPutSchema, req.body);
  const known = new Set((await CostItem.find().select('key').lean()).map((c) => c.key));
  const unknown = items.find((i) => !known.has(i.key));
  if (unknown) throw new HttpError(400, 'unknown_item', `There is no budget item called ${unknown.key}.`);
  const b = await budgetFor(req.user!._id, req.user!.homeCurrency);
  b.items = items as never;
  b.homeCurrency = req.user!.homeCurrency;
  await b.save();
  res.json({ budget: budgetJson(b) });
});

contentRouter.post('/budget/share', requireAuth, writeLimiter, async (req, res) => {
  const b = await budgetFor(req.user!._id, req.user!.homeCurrency);
  // A fresh random 32 byte token each time; revoking and sharing again gives a new link.
  if (!b.shareToken || b.shareRevokedAt) {
    b.shareToken = randomBytes(32).toString('base64url');
    b.shareRevokedAt = null;
    await b.save();
  }
  res.status(201).json({ budget: budgetJson(b) });
});

contentRouter.delete('/budget/share', requireAuth, async (req, res) => {
  const b = await budgetFor(req.user!._id, req.user!.homeCurrency);
  b.shareRevokedAt = new Date();
  await b.save();
  res.json({ budget: budgetJson(b) });
});

// ---------- Family view (no login, no contact details) ----------
contentRouter.get('/share/:token', async (req, res) => {
  const token = String(req.params.token);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw notFound('That link');
  const b = await Budget.findOne({ shareToken: token, shareRevokedAt: null }).lean();
  if (!b) throw new HttpError(404, 'link_off', 'This link is no longer active. Ask for a new one.');
  const user = await User.findById(b.userId);
  if (!user) throw notFound('That link');
  const [allCosts, rates, journey, net, names, inst] = await Promise.all([
    costs(),
    getRates(),
    journeyFor(user),
    getNetwork(),
    institutionNames(),
    user.institutionId ? Institution.findById(user.institutionId).select('name').lean() : null,
  ]);
  let listing = null;
  if (user.chosenListingId) {
    const l = await Listing.findById(user.chosenListingId).lean();
    if (l) {
      listing = serializeListing(l, net?.network ?? null, names.get(String(l.institutionIds?.[0])) ?? null);
      listing.contact = { website: null, phone: null };
    }
  }
  const view: ApiShareView = {
    studentFirstName: user.name.split(' ')[0],
    homeCurrency: user.homeCurrency,
    arrivalDate: user.arrivalDate ? user.arrivalDate.toISOString().slice(0, 10) : null,
    institutionName: inst?.name ?? null,
    costs: allCosts,
    items: b.items.map((i) => ({ key: i.key ?? '', amountAed: i.amountAed ?? null })),
    listing,
    rates,
    dayZero: journey.tasks.filter((t) => t.phase === 'arrival').map((t) => ({ key: t.key, title: t.title, phase: t.phase })),
  };
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.json({ share: view });
});
