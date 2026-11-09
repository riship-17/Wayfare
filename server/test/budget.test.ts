import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { closeDb, app, demoAgent, freshDb, newStudent } from './helpers';
import { getRates } from '../src/services/rates';
import { ExchangeRates } from '../src/models';

beforeAll(freshDb);
afterAll(closeDb);

const providerBody = (inr: number, next = Math.floor(Date.now() / 1000) + 3600) => ({
  result: 'success',
  base_code: 'AED',
  time_last_update_unix: Math.floor(Date.now() / 1000) - 60,
  time_next_update_unix: next,
  rates: { AED: 1, INR: inr, USD: 0.2723 },
});

describe('rates service', () => {
  it('fetches once per update window and serves the stored copy', async () => {
    await ExchangeRates.deleteMany({});
    const fetcher = vi.fn(async () => new Response(JSON.stringify(providerBody(22.91))));
    const a = await getRates({ fetcher: fetcher as never });
    const b = await getRates({ fetcher: fetcher as never });
    expect(a?.rates.INR).toBe(22.91);
    expect(b?.rates.INR).toBe(22.91);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('falls back to the last copy when the provider fails', async () => {
    await ExchangeRates.updateMany({}, { nextUpdateAt: new Date(Date.now() - 1000) });
    const failing = vi.fn(async () => new Response('down', { status: 503 }));
    const r = await getRates({ fetcher: failing as never });
    expect(failing).toHaveBeenCalledTimes(1);
    expect(r?.rates.INR).toBe(22.91);
  });
});

describe('budget and family share', () => {
  it('saves only known items', async () => {
    const agent = await demoAgent('student');
    const bad = await agent.put('/api/v1/budget/me').send({ items: [{ key: 'yacht', amountAed: 5 }] });
    expect(bad.status).toBe(400);
    const ok = await agent.put('/api/v1/budget/me').send({ items: [{ key: 'groceries', amountAed: 600 }] });
    expect(ok.body.budget.items).toEqual([{ key: 'groceries', amountAed: 600 }]);
    expect(ok.body.budget.homeCurrency).toBe('INR');
  });

  it('creates a random 32 byte share link that opens without login and shows no contact details', async () => {
    const agent = await demoAgent('student');
    await ExchangeRates.updateMany({}, { nextUpdateAt: new Date(Date.now() + 3_600_000) });
    const res = await agent.post('/api/v1/budget/share');
    expect(res.status).toBe(201);
    const token = res.body.budget.shareToken as string;
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    const view = await request(app).get(`/api/v1/share/${token}`);
    expect(view.status).toBe(200);
    expect(view.body.share).toMatchObject({ studentFirstName: 'Aanya', homeCurrency: 'INR', institutionName: 'Heriot-Watt University Dubai' });
    expect(view.body.share.dayZero.length).toBeGreaterThan(0);
    const text = JSON.stringify(view.body);
    expect(text).not.toContain('@');
    expect(view.headers['x-robots-tag']).toBe('noindex');
  });

  it('revokes the link', async () => {
    const agent = await demoAgent('student');
    const token = (await agent.get('/api/v1/budget/me')).body.budget.shareToken;
    await agent.delete('/api/v1/budget/share');
    expect((await request(app).get(`/api/v1/share/${token}`)).status).toBe(404);
    const again = await agent.post('/api/v1/budget/share');
    expect(again.body.budget.shareToken).not.toBe(token);
  });

  it('gives every student a budget, not just the first one', async () => {
    const a = await newStudent();
    const b = await newStudent();
    expect((await a.get('/api/v1/budget/me')).status).toBe(200);
    expect((await b.get('/api/v1/budget/me')).status).toBe(200);
  });

  it('rejects malformed tokens', async () => {
    expect((await request(app).get('/api/v1/share/abc')).status).toBe(404);
  });
});

describe('content', () => {
  it('serves essentials and costs with sources', async () => {
    const e = await request(app).get('/api/v1/essentials');
    expect(e.body.services).toHaveLength(7);
    expect(e.body.services.every((s: { source: { url: string; checkedOn: string } }) => s.source.url && s.source.checkedOn)).toBe(true);
    const c = await request(app).get('/api/v1/costs');
    const ejari = c.body.costs.find((x: { key: string }) => x.key === 'ejari');
    expect(ejari).toMatchObject({ amountAed: 120, needsEmiratesId: true });
    expect(c.body.costs.find((x: { key: string }) => x.key === 'groceries').amountAed).toBeNull();
  });

  it('serves the transit network with an ETag and routes DXB Terminal 1 to campus', async () => {
    const first = await request(app).get('/api/v1/transit/network');
    expect(first.status).toBe(200);
    expect(first.body.lines.length).toBeGreaterThanOrEqual(3);
    const etag = first.headers.etag;
    expect((await request(app).get('/api/v1/transit/network').set('If-None-Match', etag)).status).toBe(304);
    const route = await request(app).get('/api/v1/transit/route?from=metro-airport-terminal-1&to=metro-dubai-internet-city');
    expect(route.status).toBe(200);
    expect(route.body.route.steps[0]).toMatchObject({ kind: 'ride', from: 'Airport Terminal 1', to: 'Dubai Internet City' });
    expect(route.body.route.fare).toEqual({ kind: 'range', minAed: 3, maxAed: 7.5 });
  });
});
