import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { ApiListing } from '@wayfare/shared';
import { app, closeDb, demoAgent, freshDb, newStudent } from './helpers';

beforeAll(freshDb);
afterAll(closeDb);

const verify = (price: number, extra: Record<string, unknown> = {}) => ({
  status: 'verified',
  roomTypes: [{ type: 'shared', priceAedMonthly: price, depositAed: 1500 }],
  sourceUrl: 'https://example.org/price-list',
  checkedOn: '2026-11-09',
  ...extra,
});

describe('listings and verification', () => {
  let ids: string[] = [];

  it('lists four pending places for the student university with no prices', async () => {
    const agent = await demoAgent('student');
    const res = await agent.get('/api/v1/listings');
    expect(res.status).toBe(200);
    const listings: ApiListing[] = res.body.listings;
    expect(listings).toHaveLength(4);
    expect(listings.every((l) => l.verification.status === 'pending')).toBe(true);
    expect(listings.every((l) => l.roomTypes.every((r) => r.priceAedMonthly === null))).toBe(true);
    expect(listings.every((l) => l.transit === null && l.location === null)).toBe(true);
    ids = listings.map((l) => l.id);
  });

  it('blocks students from the admin portal', async () => {
    const agent = await demoAgent('student');
    expect((await agent.get('/api/v1/admin/listings')).status).toBe(403);
    expect((await agent.patch(`/api/v1/admin/listings/${ids[0]}/verification`).send(verify(3200))).status).toBe(403);
    expect((await request(app).get('/api/v1/admin/listings')).status).toBe(401);
  });

  it('requires prices, deposit, source URL and date to verify', async () => {
    const admin = await demoAgent('admin');
    const res = await admin.patch(`/api/v1/admin/listings/${ids[0]}/verification`).send({ status: 'verified', roomTypes: [] });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(['roomTypes', 'sourceUrl', 'checkedOn']));
    const badStation = await admin.patch(`/api/v1/admin/listings/${ids[0]}/verification`).send(verify(3200, { transit: { stationId: 'metro-nowhere', walkMinutesApprox: 8 } }));
    expect(badStation.status).toBe(400);
  });

  it('verifies a listing and the student sees the badge, price and transit on the next request', async () => {
    const admin = await demoAgent('admin');
    const res = await admin
      .patch(`/api/v1/admin/listings/${ids[0]}/verification`)
      .send(verify(3250, { transit: { stationId: 'metro-dubai-internet-city', walkMinutesApprox: 8 }, campusDistanceKm: 2.4 }));
    expect(res.status).toBe(200);
    const student = await demoAgent('student');
    const l: ApiListing = (await student.get(`/api/v1/listings/${ids[0]}`)).body.listing;
    expect(l.verification).toMatchObject({ status: 'verified', verifiedByName: 'Heriot-Watt University Dubai', sourceUrl: 'https://example.org/price-list', checkedOn: '2026-11-09' });
    expect(l.roomTypes[0]).toEqual({ type: 'shared', priceAedMonthly: 3250, depositAed: 1500 });
    expect(l.transit).toMatchObject({ stationName: 'Dubai Internet City', walkMinutesApprox: 8 });
    // Verified places come first
    expect((await student.get('/api/v1/listings')).body.listings[0].id).toBe(ids[0]);
  });

  it('filters by price, transit, room type and women only', async () => {
    const student = await demoAgent('student');
    const get = async (q: string) => ((await student.get(`/api/v1/listings?${q}`)).body.listings as ApiListing[]).map((l) => l.id);
    expect(await get('maxPriceAed=3300')).toEqual([ids[0]]);
    expect(await get('maxPriceAed=3000')).toEqual([]);
    expect(await get('nearTransit=true')).toEqual([ids[0]]);
    expect((await get('roomType=studio')).length).toBe(1);
    expect(await get('womenOnly=true')).toEqual([]);
    expect((await student.get('/api/v1/listings?maxPriceAed=-5')).status).toBe(400);
  });

  it('hides rejected listings from students', async () => {
    const admin = await demoAgent('admin');
    expect((await admin.patch(`/api/v1/admin/listings/${ids[1]}/verification`).send({ status: 'rejected' })).status).toBe(400);
    await admin.patch(`/api/v1/admin/listings/${ids[1]}/verification`).send({ status: 'rejected', notes: 'Provider could not confirm' });
    const student = await demoAgent('student');
    expect((await student.get('/api/v1/listings')).body.listings).toHaveLength(3);
    expect((await student.get(`/api/v1/listings/${ids[1]}`)).status).toBe(404);
    expect((await admin.get('/api/v1/admin/listings?status=rejected')).body.listings).toHaveLength(1);
  });

  it('saves a listing and records one viewing request', async () => {
    const student = await demoAgent('student');
    expect((await student.post(`/api/v1/me/saved-listings/${ids[0]}`)).body.saved).toBe(true);
    const first = await student.post(`/api/v1/listings/${ids[0]}/viewing-requests`).send({});
    expect(first.status).toBe(201);
    const again = await student.post(`/api/v1/listings/${ids[0]}/viewing-requests`).send({});
    expect(again.body.alreadyRequested).toBe(true);
    const admin = await demoAgent('admin');
    const rows = (await admin.get('/api/v1/admin/listings')).body.listings;
    expect(rows.find((r: { id: string }) => r.id === ids[0]).viewingRequests).toBe(1);
  });

  it('keeps admins inside their own institution', async () => {
    const outsider = await newStudent();
    const mongoose = (await import('mongoose')).default;
    const { User, Institution } = await import('../src/models');
    const other = await Institution.create({ name: 'Other University', slug: 'other-u', area: 'Elsewhere', website: 'https://example.org' });
    await User.updateOne({ email: (await outsider.get('/api/v1/auth/me')).body.user.email }, { role: 'institution_admin', institutionId: other._id });
    expect((await outsider.get('/api/v1/admin/listings')).body.listings).toEqual([]);
    expect((await outsider.patch(`/api/v1/admin/listings/${ids[2]}/verification`).send(verify(100))).status).toBe(404);
    void mongoose;
  });
});
