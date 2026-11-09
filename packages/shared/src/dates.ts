/** Dubai is UTC+4 all year (no daylight saving). */
const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar day number in Dubai for a moment in time. */
export function dubaiDayNumber(at: Date): number {
  return Math.floor((at.getTime() + DUBAI_OFFSET_MS) / DAY_MS);
}

/** Calendar day number for a date only value like "2026-11-21" or a Date at UTC midnight. */
export function dateOnlyDayNumber(value: string | Date): number {
  const iso = typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
}

/** Days since arrival. Negative before arrival, 0 on arrival day. */
export function dayIndex(arrivalDate: string | Date, now: Date = new Date()): number {
  return dubaiDayNumber(now) - dateOnlyDayNumber(arrivalDate);
}

/** Today's date in Dubai as YYYY-MM-DD, optionally shifted by whole days. */
export function dubaiDateString(now: Date = new Date(), plusDays = 0): string {
  const day = dubaiDayNumber(now) + plusDays;
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "9 Nov" or "9 Nov 2026" */
export function shortDate(value: string | Date, withYear = false): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const base = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return withYear ? `${base} ${d.getUTCFullYear()}` : base;
}
