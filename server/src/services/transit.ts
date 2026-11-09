import { createHash } from 'node:crypto';
import type { TransitNetwork } from '@wayfare/shared';
import { TransitLine, TransitMeta, TransitStation, toLatLng } from '../models';

let cache: { network: TransitNetwork; etag: string } | null = null;

export function invalidateTransitCache() {
  cache = null;
}

export async function getNetwork(): Promise<{ network: TransitNetwork; etag: string } | null> {
  if (cache) return cache;
  const [lines, stations, meta] = await Promise.all([TransitLine.find().lean(), TransitStation.find().lean(), TransitMeta.findById('network').lean()]);
  if (!lines.length || !meta) return null;
  const network: TransitNetwork = {
    version: meta.version ?? '',
    source: meta.source as TransitNetwork['source'],
    transfers: (meta.transfers ?? []) as TransitNetwork['transfers'],
    lines: lines.map((l) => ({ lineId: l.lineId, name: l.name, mode: l.mode, color: l.color, stationIds: l.stationIds })),
    stations: stations.map((s) => {
      const p = toLatLng(s.location)!;
      return { stationId: s.stationId, name: s.name, nameAr: s.nameAr ?? null, mode: s.mode, lineIds: s.lineIds, lat: p.lat, lng: p.lng, zone: s.zone ?? null };
    }),
  };
  const etag = `"${createHash('sha1').update(JSON.stringify(network)).digest('hex').slice(0, 16)}"`;
  cache = { network, etag };
  return cache;
}
