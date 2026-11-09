/**
 * Static demo backend. When the app is built with VITE_STATIC_DEMO=true (the Vercel showcase), every
 * /api/v1 call is answered here, in the visitor's browser, instead of by Express and MongoDB.
 * It reuses the real shared logic (Day Zero journey, unlocks, validation) and the real seed content.
 * Each visitor's changes are saved in their own browser (localStorage), so many people can run the demo at once.
 */
import {
  brokerReportSchema,
  budgetPutSchema,
  buildJourney,
  dubaiDateString,
  eidStatusSchema,
  eventSchema,
  haversineKm,
  listingQuerySchema,
  loginSchema,
  mergeTemplates,
  newlyUnlocked,
  patchMeSchema,
  postSchema,
  registerSchema,
  taskTemplatePatchSchema,
  taskUpdateSchema,
  verificationSchema,
  type ApiBudget,
  type ApiCostItem,
  type ApiInstitution,
  type ApiJourney,
  type ApiListing,
  type ApiServiceGuide,
  type ApiUser,
  type EidStatus,
  type JourneyContext,
  type TaskStatus,
  type TaskTemplateLike,
  type TransitNetwork,
} from '@wayfare/shared';
import type { ZodType } from 'zod';
import tasksSeed from '../../../server/data/tasks.json';
import essentialsSeed from '../../../server/data/essentials.json';
import costsSeed from '../../../server/data/costs.json';
import listingsSeed from '../../../server/data/listings.json';
import network from '../../public/offline/transit.json';
import ratesSnapshot from './rates.json';
import { RequestError } from '../lib/api';

const NET = network as unknown as TransitNetwork;
const KEY = 'wf-static-demo-v2';
// Ids look like MongoDB ObjectIds because the shared Zod schemas validate them.
const INST_ID = '6a1000000000000000000001';
const STUDENT_ID = 'demo-student';
const ADMIN_ID = 'demo-admin';
const LISTING_SOURCE = { label: 'Go Study In, Heriot-Watt Dubai accommodation (third party study guide). The university must confirm.', url: 'https://gostudyin.com/uk/study-in-dubai/institutes/universities/heriot-watt-dubai/', checkedOn: '2026-11-09' };

const kv = tasksSeed as unknown as (TaskTemplateLike & { costItemKeys?: string[] })[];

// ---------------------------------------------------------------- state
interface DemoUser extends ApiUser { password: string }
interface DemoListing { id: string; providerName: string; title: string; area: string; roomTypes: { type: string; priceAedMonthly: number | null; depositAed: number | null }[]; billsIncluded: string[]; amenities: string[]; houseRules: string[]; womenOnly: boolean; transit: { stationId: string; walkMinutesApprox: number } | null; campusDistanceKm: number | null; verification: { status: 'pending' | 'verified' | 'rejected'; verifiedAt: string | null; sourceUrl: string | null; checkedOn: string | null; notes: string | null } }
interface State {
  session: string | null;
  users: Record<string, DemoUser>;
  tasks: Record<string, Record<string, TaskStatus>>;
  budgets: Record<string, { items: { key: string; amountAed: number | null }[]; shareToken: string | null; shareActive: boolean }>;
  listings: DemoListing[];
  overrides: Record<string, TaskTemplateLike>;
  events: { id: string; title: string; startsAt: string; place: string; description: string; rsvp: string[] }[];
  groups: { id: string; name: string; kind: 'university' | 'home_country'; description: string; country: string | null; members: string[]; posts: { id: string; authorId: string; body: string; createdAt: string; reported: number; official: boolean }[] }[];
  reports: { id: string; listingId: string | null; contact: string; description: string; status: 'new' | 'handled'; createdAt: string }[];
  viewing: Record<string, string[]>;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const arrivalIn = (days: number) => dubaiDateString(new Date(), days);

function baseUser(over: Partial<DemoUser>): DemoUser {
  return { id: uid(), name: '', email: '', password: '', role: 'student', institutionId: INST_ID, homeCountry: null, homeCurrency: 'AED', arrivalDate: null, housingNeed: null, eidStatus: 'not_started', eidStatusUpdatedAt: null, savedListingIds: [], chosenListingId: null, language: 'en', isDemo: false, onboarded: false, ...over };
}

function fresh(): State {
  return {
    session: null,
    users: {
      [STUDENT_ID]: baseUser({ id: STUDENT_ID, name: 'Aanya Mehta', email: 'aanya.demo@wayfare.app', homeCountry: 'India', homeCurrency: 'INR', arrivalDate: arrivalIn(12), housingNeed: 'need_place', isDemo: true, onboarded: true }),
      [ADMIN_ID]: baseUser({ id: ADMIN_ID, name: 'Heriot-Watt Dubai housing office (demo)', email: 'housing.demo@wayfare.app', role: 'institution_admin', isDemo: true, onboarded: true }),
    },
    tasks: {},
    budgets: {},
    listings: (listingsSeed as unknown as DemoListing[]).map((l, i) => ({ ...l, id: `6b10000000000000000000${String(i + 1).padStart(2, '0')}`, roomTypes: l.roomTypes.map((r) => ({ type: r.type, priceAedMonthly: null, depositAed: null })), transit: null, campusDistanceKm: null, verification: { status: 'pending', verifiedAt: null, sourceUrl: null, checkedOn: null, notes: null } })),
    overrides: {},
    events: [],
    groups: [
      { id: 'g-uni', name: 'Heriot-Watt University Dubai students', kind: 'university', description: 'Announcements and events from your university. Join with your university email.', country: null, members: [], posts: [] },
      { id: 'g-india', name: 'Students from India at Heriot-Watt Dubai', kind: 'home_country', description: 'Meet students who made the same move. Moderated by the university.', country: 'India', members: [], posts: [] },
    ],
    reports: [],
    viewing: {},
  };
}

let state: State = load();
function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    // storage blocked: the demo still works for this visit
  }
  return fresh();
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------- helpers
const fail = (status: number, code: string, message: string, fields: Record<string, string> = {}): never => {
  throw new RequestError(status, code, message, fields);
};
function parse<T>(schema: ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const fields: Record<string, string> = {};
  for (const i of r.error.issues) fields[i.path.join('.') || '_'] ??= i.message;
  return fail(400, 'validation_failed', Object.values(fields)[0] ?? 'Check the highlighted fields.', fields);
}
const me = (): DemoUser => (state.session && state.users[state.session]) || fail(401, 'unauthenticated', 'Sign in to continue.');
const pub = (u: DemoUser): ApiUser => {
  const { password: _p, ...rest } = u;
  return rest;
};
const station = (id: string) => NET.stations.find((s) => s.stationId === id);

const INSTITUTION: ApiInstitution = (() => {
  const kv2 = station('tram-knowledge-village');
  return {
    id: INST_ID,
    name: 'Heriot-Watt University Dubai',
    slug: 'heriot-watt-dubai',
    area: 'Dubai Knowledge Park',
    location: kv2 ? { lat: kv2.lat, lng: kv2.lng } : null,
    nearestTransit: [
      { stationId: 'metro-dubai-internet-city', mode: 'metro', note: 'Campus shuttle to Dubai Internet City metro station (Red Line). Confirm with the university.' },
      { stationId: 'tram-knowledge-village', mode: 'tram', note: 'Knowledge Village tram stop is within walking distance. Confirm with the university.' },
    ],
    website: 'https://hw.ac.uk/dubai',
    verified: true,
  };
})();

function listingJson(l: DemoListing): ApiListing {
  const verified = l.verification.status === 'verified';
  let transit: ApiListing['transit'] = null;
  if (l.transit) {
    const s = station(l.transit.stationId);
    const line = s && NET.lines.find((x) => s.lineIds.includes(x.lineId));
    if (s) transit = { stationId: s.stationId, stationName: s.name, lineName: line?.name ?? '', mode: s.mode, walkMinutesApprox: l.transit.walkMinutesApprox };
  }
  return {
    id: l.id, institutionIds: [INST_ID], providerName: l.providerName, title: l.title, area: l.area, location: null,
    roomTypes: l.roomTypes.map((r) => ({ type: r.type as ApiListing['roomTypes'][number]['type'], priceAedMonthly: verified ? r.priceAedMonthly : null, depositAed: verified ? r.depositAed : null })),
    billsIncluded: l.billsIncluded, amenities: l.amenities, houseRules: l.houseRules, womenOnly: l.womenOnly, photos: [], contact: { website: null, phone: null }, transit,
    campusDistanceKm: l.campusDistanceKm,
    verification: { status: l.verification.status, verifiedByName: verified ? INSTITUTION.name : null, verifiedAt: l.verification.verifiedAt, sourceUrl: l.verification.sourceUrl, checkedOn: l.verification.checkedOn, notes: l.verification.notes },
    source: LISTING_SOURCE,
  };
}

function templates(): TaskTemplateLike[] {
  const global = kv.map((t) => ({ bridge: null, where: null, costNote: null, ...t, institutionId: null })) as TaskTemplateLike[];
  return mergeTemplates([...global, ...Object.values(state.overrides)], INST_ID);
}
const ctxFor = (u: DemoUser): JourneyContext => ({ arrivalDate: u.arrivalDate ?? arrivalIn(30), eidStatus: u.eidStatus, taskStatuses: state.tasks[u.id] ?? {} });
function journey(u: DemoUser): ApiJourney {
  const tpl = templates();
  return { ...buildJourney(tpl, ctxFor(u)), templates: tpl, eidStatus: u.eidStatus, arrivalDate: u.arrivalDate ?? arrivalIn(30) };
}
const budget = (u: DemoUser) => (state.budgets[u.id] ??= { items: [], shareToken: null, shareActive: false });
const budgetJson = (u: DemoUser): ApiBudget => { const b = budget(u); return { items: b.items, homeCurrency: u.homeCurrency, shareToken: b.shareActive ? b.shareToken : null, shareActive: b.shareActive }; };
const essentials = () => (essentialsSeed as unknown as (ApiServiceGuide & { order: number })[]).slice().sort((a, b) => a.order - b.order).map(({ order: _o, ...s }) => s);
const costs = () => (costsSeed as unknown as (ApiCostItem & { order: number })[]).slice().sort((a, b) => a.order - b.order).map(({ order: _o, ...c }) => ({ ...c, amountNote: c.amountNote ?? null, source: c.source ?? null, fromListing: c.fromListing ?? null }));
const token = () => { const b = new Uint8Array(32); crypto.getRandomValues(b); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const isAdmin = (u: DemoUser) => u.role !== 'student' || fail(403, 'forbidden', 'You do not have access to this.');
const eventJson = (e: State['events'][number], userId?: string) => ({ id: e.id, institutionId: INST_ID, title: e.title, startsAt: e.startsAt, place: e.place, description: e.description, rsvpCount: e.rsvp.length, going: !!userId && e.rsvp.includes(userId) });
function groupJson(g: State['groups'][number], u: DemoUser) {
  const joined = g.members.includes(u.id);
  return {
    id: g.id, institutionId: INST_ID, name: g.name, kind: g.kind, description: g.description, memberCount: g.members.length, joined, requiresDomain: null,
    posts: joined ? g.posts.slice().reverse().map((p) => ({ id: p.id, authorName: state.users[p.authorId]?.name.split(' ')[0] ?? 'Member', body: p.body, createdAt: p.createdAt, reported: p.reported > 0, official: p.official })) : [],
  };
}

// ---------------------------------------------------------------- router
type Handler = (m: RegExpMatchArray, body: unknown, query: URLSearchParams) => unknown;
const routes: [string, RegExp, Handler][] = [];
const on = (method: string, pattern: string, h: Handler) => routes.push([method, new RegExp('^' + pattern.replace(/:(\w+)/g, '([^/]+)') + '$'), h]);

on('GET', '/health', () => ({ ok: true, db: 'browser', demoMode: true, contactEmail: '{{contact_email}}', staticDemo: true }));

// auth
on('GET', '/auth/me', () => ({ user: state.session && state.users[state.session] ? pub(state.users[state.session]) : null, demoMode: true }));
on('POST', '/auth/demo', (_m, body) => {
  const as = (body as { as?: string })?.as === 'admin' ? ADMIN_ID : STUDENT_ID;
  state.session = as; save();
  return { user: pub(state.users[as]) };
});
on('POST', '/auth/register', (_m, body) => {
  const input = parse(registerSchema, body);
  if (Object.values(state.users).some((u) => u.email === input.email)) fail(409, 'email_taken', 'An account with this email already exists. Sign in instead.', { email: 'This email already has an account' });
  const u = baseUser({ name: input.name, email: input.email, password: input.password, institutionId: null });
  state.users[u.id] = u; state.session = u.id; save();
  return { user: pub(u) };
});
on('POST', '/auth/login', (_m, body) => {
  const input = parse(loginSchema, body);
  const u = Object.values(state.users).find((x) => x.email === input.email && (x.isDemo || x.password === input.password));
  if (!u) fail(401, 'bad_credentials', 'That email and password do not match. In this demo, use Try the demo instead.');
  state.session = u!.id; save();
  return { user: pub(u!) };
});
on('POST', '/auth/logout', () => { state.session = null; save(); return undefined; });

// me
on('PATCH', '/me', (_m, body) => {
  const u = me();
  const input = parse(patchMeSchema, body);
  Object.assign(u, input);
  save();
  return { user: pub(u) };
});
on('PATCH', '/me/eid-status', (_m, body) => {
  const u = me();
  const { status } = parse(eidStatusSchema, body);
  const before = ctxFor(u);
  u.eidStatus = status; u.eidStatusUpdatedAt = new Date().toISOString(); save();
  return { user: pub(u), unlocked: newlyUnlocked(templates(), before, ctxFor(u)) };
});
on('POST', '/me/saved-listings/([^/]+)', (m) => {
  const u = me(); const id = m[1];
  const has = u.savedListingIds.includes(id);
  u.savedListingIds = has ? u.savedListingIds.filter((x) => x !== id) : [...u.savedListingIds, id]; save();
  return { saved: !has, user: pub(u) };
});
on('POST', '/me/demo-controls', (_m, body) => {
  const u = me();
  if (!u.isDemo) fail(404, 'not_found', 'Presenter controls are only for the demo account.');
  const input = body as { arrivalOffsetDays?: number; eidStatus?: EidStatus; reset?: boolean };
  const before = ctxFor(u);
  if (input.reset) {
    const keep = state.session;
    state = fresh(); state.session = keep;
    save();
    const nu = me();
    return { user: pub(nu), unlocked: [], journey: journey(nu) };
  }
  if (input.arrivalOffsetDays !== undefined) u.arrivalDate = arrivalIn(input.arrivalOffsetDays);
  if (input.eidStatus) { u.eidStatus = input.eidStatus; u.eidStatusUpdatedAt = new Date().toISOString(); }
  save();
  return { user: pub(u), unlocked: newlyUnlocked(templates(), before, ctxFor(u)), journey: journey(u) };
});

// journey
on('GET', '/journey', () => journey(me()));
on('PATCH', '/journey/tasks/([^/]+)', (m, body) => {
  const u = me();
  const { status } = parse(taskUpdateSchema, body);
  const key = decodeURIComponent(m[1]);
  if (!templates().some((t) => t.key === key)) fail(404, 'not_found', 'That task could not be found.');
  (state.tasks[u.id] ??= {})[key] = status; save();
  return journey(u);
});

// listings
on('GET', '/listings', (_m, _b, q) => {
  me();
  const f = parse(listingQuerySchema, Object.fromEntries(q));
  const min = (l: DemoListing) => Math.min(...l.roomTypes.map((r) => r.priceAedMonthly ?? Infinity));
  let rows = state.listings.filter((l) => l.verification.status !== 'rejected');
  if (f.womenOnly === 'true') rows = rows.filter((l) => l.womenOnly);
  if (f.roomType) rows = rows.filter((l) => l.roomTypes.some((r) => r.type === f.roomType));
  if (f.nearTransit === 'true') rows = rows.filter((l) => (l.transit?.walkMinutesApprox ?? 99) <= 15);
  if (f.billsIncluded === 'true') rows = rows.filter((l) => l.billsIncluded.length > 0);
  if (f.maxPriceAed) rows = rows.filter((l) => l.verification.status === 'verified' && min(l) <= f.maxPriceAed!);
  rows = rows.slice().sort((a, b) => Number(b.verification.status === 'verified') - Number(a.verification.status === 'verified') || (f.sort === 'price' ? min(a) - min(b) : (a.transit?.walkMinutesApprox ?? 99) - (b.transit?.walkMinutesApprox ?? 99)));
  return { listings: rows.map(listingJson) };
});
on('GET', '/listings/([^/]+)', (m) => {
  me();
  const l = state.listings.find((x) => x.id === m[1] && x.verification.status !== 'rejected');
  if (!l) fail(404, 'not_found', 'That place could not be found.');
  return { listing: listingJson(l!) };
});
on('POST', '/listings/([^/]+)/viewing-requests', (m) => {
  const u = me(); const l = state.listings.find((x) => x.id === m[1]) ?? fail(404, 'not_found', 'That place could not be found.');
  const list = (state.viewing[l.id] ??= []); const already = list.includes(u.id);
  if (!already) list.push(u.id); save();
  return { ok: true, providerName: l.providerName, alreadyRequested: already };
});

// content
on('GET', '/institutions', () => ({ institutions: [INSTITUTION] }));
on('GET', '/institutions/([^/]+)', () => ({ institution: INSTITUTION }));
on('GET', '/essentials', () => ({ services: essentials() }));
on('GET', '/costs', () => ({ costs: costs() }));
on('GET', '/rates', () => ({ rates: ratesSnapshot }));
on('GET', '/budget/me', () => ({ budget: budgetJson(me()) }));
on('PUT', '/budget/me', (_m, body) => {
  const u = me(); const { items } = parse(budgetPutSchema, body);
  const known = new Set(costs().map((c) => c.key));
  const bad = items.find((i) => !known.has(i.key)); if (bad) fail(400, 'unknown_item', `There is no budget item called ${bad.key}.`);
  budget(u).items = items; save();
  return { budget: budgetJson(u) };
});
on('POST', '/budget/share', () => { const u = me(); const b = budget(u); if (!b.shareActive) { b.shareToken = token(); b.shareActive = true; } save(); return { budget: budgetJson(u) }; });
on('DELETE', '/budget/share', () => { const u = me(); budget(u).shareActive = false; save(); return { budget: budgetJson(u) }; });
on('GET', '/share/([^/]+)', (m) => {
  const owner = Object.values(state.users).find((u) => state.budgets[u.id]?.shareActive && state.budgets[u.id]?.shareToken === m[1]);
  if (!owner) fail(404, 'link_off', 'This demo link only opens in the browser that created it, or it has been turned off. On the real service it opens anywhere.');
  const l = owner!.chosenListingId ? state.listings.find((x) => x.id === owner!.chosenListingId) : null;
  const j = journey(owner!);
  return { share: { studentFirstName: owner!.name.split(' ')[0], homeCurrency: owner!.homeCurrency, arrivalDate: owner!.arrivalDate, institutionName: INSTITUTION.name, costs: costs(), items: budget(owner!).items, listing: l ? { ...listingJson(l), contact: { website: null, phone: null } } : null, rates: ratesSnapshot, dayZero: j.tasks.filter((t) => t.phase === 'arrival').map((t) => ({ key: t.key, title: t.title, phase: t.phase })) } };
});

// community
on('GET', '/groups', () => { const u = me(); return { groups: state.groups.filter((g) => g.kind === 'university' || g.country === u.homeCountry).map((g) => groupJson(g, u)) }; });
on('POST', '/groups/([^/]+)/join', (m) => { const u = me(); const g = state.groups.find((x) => x.id === m[1]) ?? fail(404, 'not_found', 'That group could not be found.'); if (!g.members.includes(u.id)) g.members.push(u.id); save(); return { group: groupJson(g, u) }; });
on('POST', '/groups/([^/]+)/posts', (m, body) => { const u = me(); const { body: text } = parse(postSchema, body); const g = state.groups.find((x) => x.id === m[1] && x.members.includes(u.id)) ?? fail(404, 'not_found', 'That group could not be found.'); g.posts.push({ id: uid(), authorId: u.id, body: text, createdAt: new Date().toISOString(), reported: 0, official: u.role !== 'student' }); save(); return { group: groupJson(g, u) }; });
on('POST', '/groups/([^/]+)/posts/([^/]+)/report', (m) => { me(); const p = state.groups.find((x) => x.id === m[1])?.posts.find((x) => x.id === m[2]) ?? fail(404, 'not_found', 'That post could not be found.'); p.reported++; save(); return { ok: true }; });
on('GET', '/events', () => { const u = me(); return { events: state.events.slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map((e) => eventJson(e, u.id)) }; });
on('POST', '/events/([^/]+)/rsvp', (m) => { const u = me(); const e = state.events.find((x) => x.id === m[1]) ?? fail(404, 'not_found', 'That event could not be found.'); e.rsvp = e.rsvp.includes(u.id) ? e.rsvp.filter((x) => x !== u.id) : [...e.rsvp, u.id]; save(); return { event: eventJson(e, u.id) }; });
on('POST', '/broker-reports', (_m, body) => { me(); const input = parse(brokerReportSchema, body); state.reports.push({ id: uid(), listingId: input.listingId ?? null, contact: input.contact, description: input.description, status: 'new', createdAt: new Date().toISOString() }); save(); return { id: 'ok' }; });

// admin
on('GET', '/admin/overview', () => { isAdmin(me()); const c = (s: string) => state.listings.filter((l) => l.verification.status === s).length; return { institution: { id: INST_ID, name: INSTITUTION.name }, counts: { pending: c('pending'), verified: c('verified'), rejected: c('rejected'), reports: state.reports.filter((r) => r.status === 'new').length, events: state.events.length } }; });
on('GET', '/admin/listings', (_m, _b, q) => { isAdmin(me()); const s = q.get('status'); return { listings: state.listings.filter((l) => !s || l.verification.status === s).map((l) => ({ ...listingJson(l), roomTypes: l.roomTypes, viewingRequests: state.viewing[l.id]?.length ?? 0 })) }; });
on('PATCH', '/admin/listings/([^/]+)/verification', (m, body) => {
  isAdmin(me()); const input = parse(verificationSchema, body);
  const l = state.listings.find((x) => x.id === m[1]) ?? fail(404, 'not_found', 'That listing could not be found.');
  if (input.status === 'verified') {
    if (input.transit && !station(input.transit.stationId)) fail(400, 'validation_failed', 'Pick a station from the list.', { 'transit.stationId': 'Pick a station from the list' });
    l.roomTypes = input.roomTypes; l.verification = { status: 'verified', verifiedAt: new Date().toISOString(), sourceUrl: input.sourceUrl, checkedOn: input.checkedOn, notes: input.notes ?? null };
    if (input.transit !== undefined) l.transit = input.transit ?? null;
    if (input.campusDistanceKm !== undefined) l.campusDistanceKm = input.campusDistanceKm ?? null;
    if (input.area) l.area = input.area;
  } else l.verification = { ...l.verification, status: input.status, notes: input.notes ?? null };
  save();
  return { listing: listingJson(l) };
});
on('GET', '/admin/events', () => { isAdmin(me()); return { events: state.events.map((e) => eventJson(e)) }; });
on('POST', '/admin/events', (_m, body) => { isAdmin(me()); const i = parse(eventSchema, body); const e = { id: uid(), ...i, startsAt: new Date(i.startsAt).toISOString(), rsvp: [] }; state.events.push(e); save(); return { event: eventJson(e) }; });
on('PUT', '/admin/events/([^/]+)', (m, body) => { isAdmin(me()); const i = parse(eventSchema, body); const e = state.events.find((x) => x.id === m[1]) ?? fail(404, 'not_found', 'That event could not be found.'); Object.assign(e, i, { startsAt: new Date(i.startsAt).toISOString() }); save(); return { event: eventJson(e) }; });
on('DELETE', '/admin/events/([^/]+)', (m) => { isAdmin(me()); state.events = state.events.filter((x) => x.id !== m[1]); save(); return undefined; });
const adminTasks = () => { const globalKeys = new Set(kv.map((t) => t.key)); return templates().map((t) => ({ ...t, customised: !!state.overrides[t.key] && globalKeys.has(t.key), institutionOnly: false })); };
on('GET', '/admin/tasks', () => { isAdmin(me()); return { tasks: adminTasks() }; });
on('PATCH', '/admin/tasks/([^/]+)', (m, body) => { isAdmin(me()); const input = parse(taskTemplatePatchSchema, body); const base = templates().find((t) => t.key === m[1]) ?? fail(404, 'not_found', 'That task could not be found.'); state.overrides[m[1]] = { ...base, ...input, institutionId: INST_ID } as TaskTemplateLike; save(); return { tasks: adminTasks() }; });
on('DELETE', '/admin/tasks/([^/]+)', (m) => { isAdmin(me()); delete state.overrides[m[1]]; save(); return { tasks: adminTasks() }; });
on('GET', '/admin/broker-reports', () => { isAdmin(me()); return { reports: state.reports.map((r) => ({ ...r, listingTitle: state.listings.find((l) => l.id === r.listingId)?.title ?? null })), reportedPosts: state.groups.flatMap((g) => g.posts.filter((p) => p.reported).map((p) => ({ groupId: g.id, groupName: g.name, postId: p.id, body: p.body, reports: p.reported }))) }; });
on('PATCH', '/admin/broker-reports/([^/]+)', (m, body) => { isAdmin(me()); const r = state.reports.find((x) => x.id === m[1]) ?? fail(404, 'not_found', 'That report could not be found.'); r.status = (body as { status: 'new' | 'handled' }).status; save(); return { ok: true, status: r.status }; });
on('PATCH', '/admin/groups/([^/]+)/posts/([^/]+)', (m, body) => { isAdmin(me()); const g = state.groups.find((x) => x.id === m[1]) ?? fail(404, 'not_found', 'That post could not be found.'); if ((body as { action: string }).action === 'remove') g.posts = g.posts.filter((p) => p.id !== m[2]); else g.posts.forEach((p) => { if (p.id === m[2]) p.reported = 0; }); save(); return { ok: true }; });

void haversineKm;

/** Answers an /api/v1 request in the browser. Small delay so loading states still show. */
export async function handle<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const url = new URL(path, 'https://demo.local');
  const route = routes.find(([m, re]) => m === method && re.test(url.pathname));
  await new Promise((r) => setTimeout(r, 120));
  if (!route) fail(404, 'not_found', 'That API route could not be found.');
  const result = route![2](url.pathname.match(route![1])!, init.json, url.searchParams);
  return structuredClone(result) as T;
}
