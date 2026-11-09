import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ApiJourney } from '@wayfare/shared';
import { closeDb, demoAgent, freshDb } from './helpers';

beforeAll(freshDb);
afterAll(closeDb);

describe('journey', () => {
  it('gives the demo student 12 days to go, Prepare, an empty battery and one next step', async () => {
    const agent = await demoAgent('student');
    const j: ApiJourney = (await agent.get('/api/v1/journey')).body;
    expect(j.countdown).toBe('12 days to go');
    expect(j.stage).toBe('prepare');
    expect(j.battery.percent).toBe(0);
    expect(j.nextStepKey).toBe('choose-housing');
    expect(j.tasks).toHaveLength(20);
  });

  it('locks Emirates ID tasks with their bridges', async () => {
    const agent = await demoAgent('student');
    const j: ApiJourney = (await agent.get('/api/v1/journey')).body;
    const locked = j.tasks.filter((t) => t.missing.includes('emirates_id'));
    expect(locked.map((t) => t.key).sort()).toEqual(['register-ejari', 'resident-sim', 'student-nol']);
    expect(locked.every((t) => t.availability === 'locked' && t.bridge)).toBe(true);
  });

  it('marks a task done, charges the battery and moves the next step', async () => {
    const agent = await demoAgent('student');
    const res = await agent.patch('/api/v1/journey/tasks/choose-housing').send({ status: 'done' });
    expect(res.status).toBe(200);
    expect(res.body.battery.percent).toBeGreaterThan(0);
    expect(res.body.nextStepKey).toBe('confirm-entry-permit');
  });

  it('rejects unknown tasks and bad statuses', async () => {
    const agent = await demoAgent('student');
    expect((await agent.patch('/api/v1/journey/tasks/nope').send({ status: 'done' })).status).toBe(404);
    expect((await agent.patch('/api/v1/journey/tasks/choose-housing').send({ status: 'finished' })).status).toBe(400);
  });

  it('unlocks tasks when the Emirates ID is received and says which', async () => {
    const agent = await demoAgent('student');
    await agent.patch('/api/v1/me/eid-status').send({ status: 'residence_issued' });
    const res = await agent.patch('/api/v1/me/eid-status').send({ status: 'card_received' });
    expect(res.body.unlocked.sort()).toEqual(['register-ejari', 'resident-sim', 'student-nol']);
  });

  it('lets the presenter shift the arrival date to today', async () => {
    const agent = await demoAgent('student');
    const res = await agent.post('/api/v1/me/demo-controls').send({ arrivalOffsetDays: 0 });
    expect(res.body.journey.stage).toBe('arrive');
    expect(res.body.journey.countdown).toBe('Day Zero in Dubai');
    const reset = await agent.post('/api/v1/me/demo-controls').send({ reset: true });
    expect(reset.body.journey.countdown).toBe('12 days to go');
    expect(reset.body.journey.battery.percent).toBe(0);
  });

  it('never accepts document numbers on the profile', async () => {
    const agent = await demoAgent('student');
    const res = await agent.patch('/api/v1/me').send({ passportNumber: 'Z1234567', name: 'Aanya Mehta' });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('Z1234567');
  });
});
