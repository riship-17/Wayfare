import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { connectDb } from '../src/db';
import { env } from '../src/env';
import { seed } from '../src/seed/seed';

export const app = createApp();

export async function freshDb() {
  if (mongoose.connection.readyState !== 1) await connectDb(env.MONGODB_URI);
  await mongoose.connection.dropDatabase();
  await (await import('../src/db')).syncIndexes();
  await seed({ reset: true, quiet: true });
}

export async function closeDb() {
  await mongoose.disconnect();
}

/** A supertest agent that keeps cookies, signed in as the demo student or admin. */
export async function demoAgent(as: 'student' | 'admin') {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/demo').send({ as });
  if (res.status !== 200) throw new Error(`demo login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

export async function newStudent(email = `s${Date.now()}${Math.random().toString(16).slice(2, 6)}@example.com`) {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/register').send({ name: 'Omar Haddad', email, password: 'longenough1' });
  if (res.status !== 201) throw new Error(`register failed: ${res.status}`);
  return agent;
}
