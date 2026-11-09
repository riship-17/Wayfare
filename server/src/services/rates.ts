import type { RatesSnapshot } from '@wayfare/shared';
import { env } from '../env';
import { ExchangeRates } from '../models';

const PROVIDER = 'Exchange Rate API (open.er-api.com)';
const FALLBACK_WINDOW_MS = 12 * 60 * 60 * 1000;
let inflight: Promise<RatesSnapshot | null> | null = null;

type Fetcher = typeof fetch;

function toSnapshot(doc: { rates: Map<string, number> | Record<string, number>; fetchedAt: Date; nextUpdateAt?: Date | null; provider: string }): RatesSnapshot {
  const rates = doc.rates instanceof Map ? Object.fromEntries(doc.rates) : doc.rates;
  return { base: 'AED', rates, fetchedAt: doc.fetchedAt.toISOString(), nextUpdateAt: doc.nextUpdateAt?.toISOString() ?? null, provider: doc.provider };
}

async function fetchFromProvider(fetcher: Fetcher): Promise<RatesSnapshot | null> {
  const res = await fetcher(env.RATES_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`rates provider ${res.status}`);
  const body = (await res.json()) as { result: string; base_code: string; rates: Record<string, number>; time_last_update_unix: number; time_next_update_unix: number };
  if (body.result !== 'success' || body.base_code !== 'AED') throw new Error('rates provider returned an unexpected body');
  const fetchedAt = new Date(body.time_last_update_unix * 1000);
  const nextUpdateAt = body.time_next_update_unix ? new Date(body.time_next_update_unix * 1000) : new Date(Date.now() + FALLBACK_WINDOW_MS);
  await ExchangeRates.deleteMany({});
  const doc = await ExchangeRates.create({ base: 'AED', rates: body.rates, fetchedAt, nextUpdateAt, provider: PROVIDER });
  return toSnapshot(doc);
}

/**
 * Serves the stored copy and fetches from the provider at most once per update window.
 * If the provider is down, the last stored copy is returned. The client never calls the provider.
 */
export async function getRates(opts: { fetcher?: Fetcher; now?: Date } = {}): Promise<RatesSnapshot | null> {
  const now = opts.now ?? new Date();
  const stored = await ExchangeRates.findOne().sort({ fetchedAt: -1 }).lean();
  const fresh = stored && stored.nextUpdateAt && stored.nextUpdateAt > now;
  if (fresh) return toSnapshot(stored as never);
  if (!inflight) {
    inflight = fetchFromProvider(opts.fetcher ?? fetch)
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  const fetched = await inflight;
  if (fetched) return fetched;
  return stored ? toSnapshot(stored as never) : null;
}
