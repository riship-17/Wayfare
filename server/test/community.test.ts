import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, demoAgent, freshDb, newStudent } from './helpers';

beforeAll(freshDb);
afterAll(closeDb);

describe('events, groups and reports', () => {
  it('shows no invented events, then the one the university posts', async () => {
    const student = await demoAgent('student');
    expect((await student.get('/api/v1/events')).body.events).toEqual([]);
    const admin = await demoAgent('admin');
    const created = await admin.post('/api/v1/admin/events').send({ title: 'Welcome week walk to the tram', startsAt: new Date(Date.now() + 86_400_000).toISOString(), place: 'Main reception', description: '' });
    expect(created.status).toBe(201);
    const events = (await student.get('/api/v1/events')).body.events;
    expect(events).toHaveLength(1);
    const rsvp = await student.post(`/api/v1/events/${events[0].id}/rsvp`);
    expect(rsvp.body.event).toMatchObject({ going: true, rsvpCount: 1 });
  });

  it('needs a university email to join the university group', async () => {
    const outsider = await newStudent();
    const demo = await demoAgent('student');
    const { User } = await import('../src/models');
    const me = (await demo.get('/api/v1/auth/me')).body.user;
    await User.updateOne({ email: (await outsider.get('/api/v1/auth/me')).body.user.email }, { institutionId: me.institutionId, homeCountry: 'India' });
    const groups = (await outsider.get('/api/v1/groups')).body.groups;
    const uni = groups.find((g: { kind: string }) => g.kind === 'university');
    expect(uni.requiresDomain).toBe('hw.ac.uk');
    const denied = await outsider.post(`/api/v1/groups/${uni.id}/join`).send({ email: 'me@gmail.com' });
    expect(denied.status).toBe(403);
    const ok = await outsider.post(`/api/v1/groups/${uni.id}/join`).send({ email: 'me@hw.ac.uk' });
    expect(ok.body.group.joined).toBe(true);
    const posted = await outsider.post(`/api/v1/groups/${uni.id}/posts`).send({ body: 'Is anyone landing at Terminal 3 on Saturday?' });
    const postId = posted.body.group.posts[0].id;
    expect((await outsider.post(`/api/v1/groups/${uni.id}/posts/${postId}/report`)).status).toBe(200);
    const admin = await demoAgent('admin');
    expect((await admin.get('/api/v1/admin/broker-reports')).body.reportedPosts).toHaveLength(1);
  });

  it('sends broker reports to the admin queue', async () => {
    const student = await demoAgent('student');
    expect((await student.post('/api/v1/broker-reports').send({ contact: 'x', description: 'short' })).status).toBe(400);
    const res = await student.post('/api/v1/broker-reports').send({ contact: 'WhatsApp +971 50 000 0000', description: 'Asked for a deposit before any viewing.' });
    expect(res.status).toBe(201);
    const admin = await demoAgent('admin');
    const reports = (await admin.get('/api/v1/admin/broker-reports')).body.reports;
    expect(reports).toHaveLength(1);
    expect((await admin.patch(`/api/v1/admin/broker-reports/${reports[0].id}`).send({ status: 'handled' })).body.status).toBe('handled');
  });

  it('lets an institution customise a checklist task for its own students only', async () => {
    const admin = await demoAgent('admin');
    const res = await admin.patch('/api/v1/admin/tasks/student-services').send({ where: 'Block 2, ground floor' });
    expect(res.status).toBe(200);
    expect(res.body.tasks.find((t: { key: string }) => t.key === 'student-services')).toMatchObject({ customised: true, where: 'Block 2, ground floor' });
    const student = await demoAgent('student');
    const task = (await student.get('/api/v1/journey')).body.tasks.find((t: { key: string }) => t.key === 'student-services');
    expect(task.where).toBe('Block 2, ground floor');
    const outsider = await newStudent();
    const other = (await outsider.get('/api/v1/journey')).body.tasks.find((t: { key: string }) => t.key === 'student-services');
    expect(other.where).toBe('Your campus');
    await admin.delete('/api/v1/admin/tasks/student-services');
    expect((await student.get('/api/v1/journey')).body.tasks.find((t: { key: string }) => t.key === 'student-services').where).toBe('Your campus');
  });
});
