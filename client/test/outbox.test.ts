import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestError } from '../src/lib/api';
import { db } from '../src/lib/db';
import { flushOutbox, pendingCount, queueTask } from '../src/lib/offline';

beforeEach(async () => {
  await db.outbox.clear();
});

describe('sync outbox', () => {
  it('keeps only the latest change per task', async () => {
    await queueTask('plan-budget', 'done');
    await queueTask('plan-budget', 'todo');
    await queueTask('silver-nol', 'done');
    expect(await pendingCount()).toBe(2);
  });

  it('sends queued changes in order and empties the outbox', async () => {
    await queueTask('a', 'done');
    await queueTask('b', 'done');
    const send = vi.fn(async (_key: string) => ({}));
    expect(await flushOutbox(send)).toBe(2);
    expect(send.mock.calls.map((c) => c[0])).toEqual(['a', 'b']);
    expect(await pendingCount()).toBe(0);
  });

  it('stops at a network failure and keeps the rest for later', async () => {
    await queueTask('a', 'done');
    await queueTask('b', 'done');
    const send = vi.fn(async (key: string) => {
      if (key === 'b') throw new RequestError(0, 'offline', 'offline');
      return {};
    });
    expect(await flushOutbox(send)).toBe(1);
    expect(await pendingCount()).toBe(1);
  });

  it('drops changes the server rejects so they never block the queue', async () => {
    await queueTask('gone', 'done');
    await queueTask('ok', 'done');
    const send = vi.fn(async (key: string) => {
      if (key === 'gone') throw new RequestError(404, 'not_found', 'That task could not be found.');
      return {};
    });
    expect(await flushOutbox(send)).toBe(1);
    expect(await pendingCount()).toBe(0);
  });
});
