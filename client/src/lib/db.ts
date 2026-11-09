import Dexie, { type Table } from 'dexie';
import type { TaskStatus } from '@wayfare/shared';

export interface KvRow {
  key: string;
  value: unknown;
  savedAt: string;
}

export interface OutboxRow {
  id?: number;
  kind: 'task';
  key: string;
  status: TaskStatus;
  createdAt: string;
}

/** Offline mirror of the student's journey, saved listings, budget and latest rates, plus the sync outbox. */
class WayfareDb extends Dexie {
  kv!: Table<KvRow, string>;
  outbox!: Table<OutboxRow, number>;
  constructor() {
    super('wayfare');
    this.version(1).stores({ kv: 'key', outbox: '++id, key' });
  }
}

export const db = new WayfareDb();

export async function saveKv(key: string, value: unknown) {
  try {
    await db.kv.put({ key, value, savedAt: new Date().toISOString() });
  } catch {
    // storage can be unavailable (private mode); the app keeps working online
  }
}

export async function readKv<T>(key: string): Promise<{ value: T; savedAt: string } | null> {
  try {
    const row = await db.kv.get(key);
    return row ? { value: row.value as T, savedAt: row.savedAt } : null;
  } catch {
    return null;
  }
}

export async function clearUserData() {
  try {
    await Promise.all([db.kv.clear(), db.outbox.clear()]);
  } catch {
    // ignore
  }
}
