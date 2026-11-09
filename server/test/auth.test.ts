import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, closeDb, freshDb } from './helpers';

beforeAll(freshDb);
afterAll(closeDb);

describe('auth', () => {
  it('reports health', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, db: 'up' });
  });

  it('registers with an httpOnly SameSite=Lax session cookie and never returns the hash', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'Priya Nair', email: 'Priya@Example.com', password: 'longenough1' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Priya Nair', email: 'priya@example.com', role: 'student' });
    expect(res.body.user.passwordHash).toBeUndefined();
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/wf_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('rejects a duplicate email with a field error', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'Priya', email: 'priya@example.com', password: 'longenough1' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('email_taken');
  });

  it('validates input with Zod and returns JSON errors', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: '', email: 'nope', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
    expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('logs in, reads me, and logs out', async () => {
    const agent = request.agent(app);
    const bad = await agent.post('/api/v1/auth/login').send({ email: 'priya@example.com', password: 'wrong-password' });
    expect(bad.status).toBe(401);
    const ok = await agent.post('/api/v1/auth/login').send({ email: 'priya@example.com', password: 'longenough1' });
    expect(ok.status).toBe(200);
    expect((await agent.get('/api/v1/auth/me')).body.user.email).toBe('priya@example.com');
    await agent.post('/api/v1/auth/logout');
    expect((await agent.get('/api/v1/auth/me')).body.user).toBeNull();
  });

  it('signs in as the demo student and admin in demo mode', async () => {
    const s = await request(app).post('/api/v1/auth/demo').send({ as: 'student' });
    expect(s.body.user).toMatchObject({ name: 'Aanya Mehta', homeCurrency: 'INR', isDemo: true });
    const a = await request(app).post('/api/v1/auth/demo').send({ as: 'admin' });
    expect(a.body.user.role).toBe('institution_admin');
  });

  it('needs a session for student routes', async () => {
    const res = await request(app).get('/api/v1/journey');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthenticated');
  });

  it('returns JSON for unknown API routes', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
