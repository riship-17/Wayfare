/**
 * Seeds content and, in demo mode, the demo accounts. Safe to run again.
 *   npm run seed            add anything missing, refresh content from server/data
 *   npm run seed -- --reset also reset listings to pending and the demo student to day one
 * Every fact in server/data carries a source and a checked on date. Unknown values stay null.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import type { Types } from 'mongoose';
import { dubaiDateString, type ApiServiceGuide } from '@wayfare/shared';
import { connectDb, disconnectDb, syncIndexes } from '../db';
import { env } from '../env';
import { Budget, CostItem, Group, Institution, Listing, ServiceGuide, TaskTemplate, TransitLine, TransitStation, User, UserTask } from '../models';
import { importTransit } from '../../scripts/import-transit';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(here, '../../data');
const OFFLINE = path.resolve(here, '../../../client/public/offline');
const read = <T>(f: string): T => JSON.parse(readFileSync(path.join(DATA, f), 'utf8')) as T;

const LISTING_SOURCE = {
  label: 'Go Study In, Heriot-Watt Dubai accommodation (third party study guide). The university must confirm.',
  url: 'https://gostudyin.com/uk/study-in-dubai/institutes/universities/heriot-watt-dubai/',
  checkedOn: '2026-11-09',
};

export async function seed({ reset = false, quiet = false } = {}) {
  const log = (...a: unknown[]) => !quiet && console.log(...a);

  if ((await TransitLine.countDocuments()) === 0) {
    log('Importing transit (no network in the database yet)...');
    await importTransit({ quiet });
  }

  // ---------- Institution ----------
  type InstSeed = { name: string; slug: string; area: string; emailDomainEnv: string; website: string; locationFromStation: string; nearestTransit: unknown[]; source: unknown };
  const instIds = new Map<string, Types.ObjectId>();
  for (const i of read<InstSeed[]>('institutions.json')) {
    // Coordinates come from the transit import, never typed by hand.
    const station = await TransitStation.findOne({ stationId: i.locationFromStation }).lean();
    const domain = (env as Record<string, unknown>)[i.emailDomainEnv] as string | undefined;
    const doc = await Institution.findOneAndUpdate(
      { slug: i.slug },
      { name: i.name, area: i.area, website: i.website, nearestTransit: i.nearestTransit, source: i.source, emailDomains: domain ? [domain] : [], location: station?.location ?? null },
      { upsert: true, returnDocument: 'after' },
    );
    instIds.set(i.slug, doc._id);
  }
  const hw = instIds.get('heriot-watt-dubai')!;
  const hwDoc = await Institution.findById(hw).lean();
  log(`Institution: ${hwDoc?.name}`);

  // ---------- Tasks (global templates; institution copies are left alone) ----------
  const tasks = read<Record<string, unknown>[]>('tasks.json');
  for (const t of tasks) {
    await TaskTemplate.findOneAndUpdate({ key: t.key as string, institutionId: null }, { bridge: null, where: null, costNote: null, costItemKeys: [], ...t, institutionId: null }, { upsert: true });
  }
  log(`Task templates: ${tasks.length}`);

  // ---------- Essentials (also written for offline) ----------
  const services = read<(ApiServiceGuide & { order: number })[]>('essentials.json');
  for (const s of services) await ServiceGuide.findOneAndUpdate({ key: s.key }, s, { upsert: true });
  mkdirSync(OFFLINE, { recursive: true });
  writeFileSync(path.join(OFFLINE, 'essentials.json'), JSON.stringify({ services: services.sort((a, b) => a.order - b.order).map(({ order: _o, ...s }) => s) }));
  log(`Essentials: ${services.length} (written to client/public/offline/essentials.json)`);

  // ---------- Costs ----------
  const costs = read<Record<string, unknown>[]>('costs.json');
  for (const c of costs) await CostItem.findOneAndUpdate({ key: c.key as string }, c, { upsert: true });
  log(`Cost items: ${costs.length}`);

  // ---------- Listings: pending until the university verifies them ----------
  type ListingSeed = { providerName: string; title: string; area: string; roomTypes: { type: string }[] } & Record<string, unknown>;
  for (const l of read<ListingSeed[]>('listings.json')) {
    const exists = await Listing.findOne({ providerName: l.providerName });
    const base = {
      ...l,
      institutionIds: [hw],
      roomTypes: l.roomTypes.map((r) => ({ type: r.type, priceAedMonthly: null, depositAed: null })),
      photos: [],
      location: null,
      transit: null,
      campusDistanceKm: null,
      source: LISTING_SOURCE,
      verification: { status: 'pending' as const, verifiedBy: null, verifiedAt: null, sourceUrl: null, checkedOn: null, notes: null },
    };
    if (!exists) await Listing.create(base as never);
    else if (reset) await Listing.updateOne({ _id: exists._id }, base as never);
  }
  log(`Listings: ${await Listing.countDocuments()} (${await Listing.countDocuments({ 'verification.status': 'pending' })} pending)`);

  // ---------- Groups (no invented posts) ----------
  await Group.findOneAndUpdate(
    { institutionId: hw, kind: 'university' },
    { name: 'Heriot-Watt University Dubai students', description: 'Announcements and events from your university. Join with your university email.' },
    { upsert: true },
  );
  await Group.findOneAndUpdate(
    { institutionId: hw, kind: 'home_country', country: 'India' },
    { name: 'Students from India at Heriot-Watt Dubai', description: 'Meet students who made the same move. Moderated by the university.' },
    { upsert: true },
  );

  // ---------- Demo accounts ----------
  if (!env.DEMO_MODE) {
    const removed = await User.find({ isDemo: true }).select('_id').lean();
    await Promise.all([UserTask.deleteMany({ userId: { $in: removed.map((u) => u._id) } }), Budget.deleteMany({ userId: { $in: removed.map((u) => u._id) } }), User.deleteMany({ isDemo: true })]);
    log('Demo mode is off: demo accounts removed.');
    return;
  }
  if (!env.DEMO_STUDENT_PASSWORD || !env.DEMO_ADMIN_PASSWORD) throw new Error('Set DEMO_STUDENT_PASSWORD and DEMO_ADMIN_PASSWORD in .env');

  const arrival = new Date(`${dubaiDateString(new Date(), 12)}T00:00:00Z`);
  let student = await User.findOne({ email: env.DEMO_STUDENT_EMAIL });
  if (!student || reset) {
    const fields = {
      name: 'Aanya Mehta',
      email: env.DEMO_STUDENT_EMAIL,
      passwordHash: await bcrypt.hash(env.DEMO_STUDENT_PASSWORD, 12),
      role: 'student' as const,
      institutionId: hw,
      homeCountry: 'India',
      homeCurrency: 'INR',
      arrivalDate: arrival,
      housingNeed: 'need_place' as const,
      eidStatus: 'not_started' as const,
      eidStatusUpdatedAt: null,
      savedListingIds: [],
      chosenListingId: null,
      onboarded: true,
      isDemo: true,
    };
    if (student) await student.set(fields).save();
    else student = await User.create(fields);
    await Promise.all([UserTask.deleteMany({ userId: student._id }), Budget.deleteMany({ userId: student._id })]);
  }
  let admin = await User.findOne({ email: env.DEMO_ADMIN_EMAIL });
  if (!admin || reset) {
    const fields = {
      name: 'Heriot-Watt Dubai housing office (demo)',
      email: env.DEMO_ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(env.DEMO_ADMIN_PASSWORD, 12),
      role: 'institution_admin' as const,
      institutionId: hw,
      homeCurrency: 'AED',
      onboarded: true,
      isDemo: true,
    };
    if (admin) await admin.set(fields).save();
    else admin = await User.create(fields);
  }
  await Institution.updateOne({ _id: hw }, { $addToSet: { adminIds: admin._id } });
  log(`Demo student: ${student.email} (${student.name}, arriving ${student.arrivalDate?.toISOString().slice(0, 10)})`);
  log(`Demo admin: ${admin.email}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  (async () => {
    await connectDb(env.MONGODB_URI);
    await syncIndexes();
    await seed({ reset: process.argv.includes('--reset') });
    await disconnectDb();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
