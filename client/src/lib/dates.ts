import { shortDate } from '@wayfare/shared';

export { shortDate };

export function eventWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Dubai' });
  const time = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Dubai' });
  return `${day} · ${time}`;
}

export function savedOn(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })}`;
}
