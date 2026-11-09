import { useSyncExternalStore } from 'react';
import type { TaskStatus } from '@wayfare/shared';
import { patch, RequestError } from './api';
import { db } from './db';

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

/** Queue a task change made offline. Later changes to the same task replace earlier ones. */
export async function queueTask(key: string, status: TaskStatus) {
  await db.transaction('rw', db.outbox, async () => {
    await db.outbox.where('key').equals(key).delete();
    await db.outbox.add({ kind: 'task', key, status, createdAt: new Date().toISOString() });
  });
}

export async function pendingCount(): Promise<number> {
  try {
    return await db.outbox.count();
  } catch {
    return 0;
  }
}

type Sender = (key: string, status: TaskStatus) => Promise<unknown>;
const defaultSender: Sender = (key, status) => patch(`/journey/tasks/${encodeURIComponent(key)}`, { status });

/**
 * Sends queued changes in order. Stops at the first network failure and keeps the rest.
 * Changes the server rejects (for example a task that no longer exists) are dropped.
 * Returns how many were sent.
 */
export async function flushOutbox(send: Sender = defaultSender): Promise<number> {
  const rows = await db.outbox.orderBy('id').toArray();
  let sent = 0;
  for (const row of rows) {
    try {
      await send(row.key, row.status);
      sent++;
      await db.outbox.delete(row.id!);
    } catch (err) {
      if (err instanceof RequestError && !err.offline && err.status >= 400 && err.status < 500 && err.status !== 401) {
        await db.outbox.delete(row.id!);
        continue;
      }
      break;
    }
  }
  return sent;
}
