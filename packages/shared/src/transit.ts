import type { TransitMode } from './enums';

export interface TransitStation {
  stationId: string;
  name: string;
  nameAr?: string | null;
  mode: TransitMode;
  lineIds: string[];
  lat: number;
  lng: number;
  zone?: string | null;
}

export interface TransitLine {
  lineId: string;
  name: string;
  mode: TransitMode;
  color: string;
  /** Ordered from one terminus to the other */
  stationIds: string[];
}

export interface TransitTransfer {
  from: string;
  to: string;
  walkMinutes: number;
}

export interface TransitNetwork {
  lines: TransitLine[];
  stations: TransitStation[];
  /** Walking links between nearby stations of different modes (for example metro to tram). */
  transfers: TransitTransfer[];
  source: { label: string; url: string; license: string; fetchedOn: string };
  version: string;
}

export type RouteStep =
  | { kind: 'ride'; lineId: string; lineName: string; color: string; mode: TransitMode; from: string; to: string; towards: string; stops: number; minutes: number; stationIds: string[] }
  | { kind: 'change'; at: string; toLineName: string; minutes: number }
  | { kind: 'walk'; from: string; to: string; minutes: number };

export type FareEstimate =
  | { kind: 'zones'; zones: number; amountAed: number }
  | { kind: 'range'; minAed: number; maxAed: number };

export interface RouteResult {
  from: string;
  to: string;
  steps: RouteStep[];
  minutes: number;
  stationIds: string[];
  fare: FareEstimate;
}

const EARTH_KM = 6371;

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/** Straight line distance to walking minutes: 1.25 detour factor at 4.8 km/h, rounded up, at least 1. */
export function walkMinutes(straightKm: number): number {
  return Math.max(1, Math.ceil(((straightKm * 1.25) / 4.8) * 60));
}

/** Approximate ride minutes between two adjacent stops. Metro about 45 km/h, tram about 18 km/h, plus 30s dwell. */
export function rideMinutes(km: number, mode: TransitMode): number {
  const speed = mode === 'metro' ? 45 : 18;
  return (km / speed) * 60 + 0.5;
}

/** Silver nol card fares by zones crossed (RTA): 1 zone AED 3, 2 zones AED 5, more AED 7.50. */
export const SILVER_FARES_AED = { oneZone: 3, twoZones: 5, more: 7.5 } as const;

export function fareForZones(zones: number): number {
  if (zones <= 1) return SILVER_FARES_AED.oneZone;
  if (zones === 2) return SILVER_FARES_AED.twoZones;
  return SILVER_FARES_AED.more;
}

/** Uses zone data when every station on the route has it, otherwise the published range. */
export function estimateFare(stationIds: string[], stations: Map<string, TransitStation>): FareEstimate {
  const zones = stationIds.map((id) => stations.get(id)?.zone ?? null);
  if (zones.length > 0 && zones.every((z) => z)) {
    const crossed = new Set(zones).size;
    return { kind: 'zones', zones: crossed, amountAed: fareForZones(crossed) };
  }
  return { kind: 'range', minAed: SILVER_FARES_AED.oneZone, maxAed: SILVER_FARES_AED.more };
}

const CHANGE_MINUTES = 5;
const TRANSFER_WAIT_MINUTES = 4;

interface Edge {
  to: string; // state key
  minutes: number;
  kind: 'ride' | 'change' | 'walk';
  lineId?: string;
}

const stateKey = (stationId: string, lineId: string) => `${stationId}|${lineId}`;
const splitKey = (key: string) => key.split('|') as [string, string];

/** Shortest route by approximate minutes, with a line change penalty. Runs the same on server and offline client. */
export function planRoute(network: TransitNetwork, fromId: string, toId: string): RouteResult | null {
  const stations = new Map(network.stations.map((s) => [s.stationId, s]));
  const lines = new Map(network.lines.map((l) => [l.lineId, l]));
  const from = stations.get(fromId);
  const to = stations.get(toId);
  if (!from || !to) return null;

  const graph = new Map<string, Edge[]>();
  const add = (k: string, e: Edge) => {
    const list = graph.get(k);
    if (list) list.push(e);
    else graph.set(k, [e]);
  };

  for (const line of network.lines) {
    for (let i = 0; i < line.stationIds.length - 1; i++) {
      const a = stations.get(line.stationIds[i]);
      const b = stations.get(line.stationIds[i + 1]);
      if (!a || !b) continue;
      const m = rideMinutes(haversineKm(a, b), line.mode);
      add(stateKey(a.stationId, line.lineId), { to: stateKey(b.stationId, line.lineId), minutes: m, kind: 'ride', lineId: line.lineId });
      add(stateKey(b.stationId, line.lineId), { to: stateKey(a.stationId, line.lineId), minutes: m, kind: 'ride', lineId: line.lineId });
    }
  }
  for (const s of network.stations) {
    for (const l1 of s.lineIds) {
      for (const l2 of s.lineIds) {
        if (l1 !== l2) add(stateKey(s.stationId, l1), { to: stateKey(s.stationId, l2), minutes: CHANGE_MINUTES, kind: 'change', lineId: l2 });
      }
    }
  }
  for (const t of network.transfers) {
    const a = stations.get(t.from);
    const b = stations.get(t.to);
    if (!a || !b) continue;
    for (const l1 of a.lineIds) {
      for (const l2 of b.lineIds) {
        add(stateKey(a.stationId, l1), { to: stateKey(b.stationId, l2), minutes: t.walkMinutes + TRANSFER_WAIT_MINUTES, kind: 'walk', lineId: l2 });
        add(stateKey(b.stationId, l2), { to: stateKey(a.stationId, l1), minutes: t.walkMinutes + TRANSFER_WAIT_MINUTES, kind: 'walk', lineId: l1 });
      }
    }
  }

  // Dijkstra. The network is small (about 100 states), so a simple array queue is fine.
  const dist = new Map<string, number>();
  const prev = new Map<string, { from: string; edge: Edge }>();
  const queue: string[] = [];
  for (const l of from.lineIds) {
    const k = stateKey(from.stationId, l);
    dist.set(k, 0);
    queue.push(k);
  }
  const done = new Set<string>();
  let goal: string | null = null;
  while (queue.length) {
    queue.sort((a, b) => (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity));
    const cur = queue.shift()!;
    if (done.has(cur)) continue;
    done.add(cur);
    if (splitKey(cur)[0] === to.stationId) {
      goal = cur;
      break;
    }
    for (const e of graph.get(cur) ?? []) {
      const nd = (dist.get(cur) ?? 0) + e.minutes;
      if (nd < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, nd);
        prev.set(e.to, { from: cur, edge: e });
        queue.push(e.to);
      }
    }
  }
  if (!goal) return null;

  const path: { state: string; edge?: Edge }[] = [{ state: goal }];
  let k = goal;
  while (prev.has(k)) {
    const p = prev.get(k)!;
    path[0].edge = p.edge;
    path.unshift({ state: p.from });
    k = p.from;
  }

  const steps: RouteStep[] = [];
  const visited: string[] = [from.stationId];
  for (let i = 1; i < path.length; i++) {
    const edge = path[i].edge!;
    const [sid] = splitKey(path[i].state);
    const [prevSid] = splitKey(path[i - 1].state);
    if (edge.kind === 'ride') {
      const line = lines.get(edge.lineId!)!;
      const last = steps[steps.length - 1];
      const dirIdx = line.stationIds.indexOf(sid) > line.stationIds.indexOf(prevSid) ? line.stationIds.length - 1 : 0;
      const towards = stations.get(line.stationIds[dirIdx])!.name;
      if (last && last.kind === 'ride' && last.lineId === line.lineId) {
        last.to = stations.get(sid)!.name;
        last.stops += 1;
        last.minutes += edge.minutes;
        last.stationIds.push(sid);
      } else {
        steps.push({
          kind: 'ride',
          lineId: line.lineId,
          lineName: line.name,
          color: line.color,
          mode: line.mode,
          from: stations.get(prevSid)!.name,
          to: stations.get(sid)!.name,
          towards,
          stops: 1,
          minutes: edge.minutes,
          stationIds: [prevSid, sid],
        });
      }
      visited.push(sid);
    } else if (edge.kind === 'change') {
      steps.push({ kind: 'change', at: stations.get(sid)!.name, toLineName: lines.get(edge.lineId!)!.name, minutes: edge.minutes });
    } else {
      steps.push({ kind: 'walk', from: stations.get(prevSid)!.name, to: stations.get(sid)!.name, minutes: edge.minutes });
      visited.push(sid);
    }
  }
  for (const s of steps) if (s.kind === 'ride') s.minutes = Math.max(1, Math.round(s.minutes));

  return {
    from: from.name,
    to: to.name,
    steps,
    minutes: Math.round(dist.get(goal) ?? 0),
    stationIds: visited,
    fare: estimateFare(visited, stations),
  };
}

/** Nearest station to a point, optionally by mode. */
export function nearestStation(
  network: TransitNetwork,
  point: { lat: number; lng: number },
  mode?: TransitMode,
): { station: TransitStation; km: number } | null {
  let best: { station: TransitStation; km: number } | null = null;
  for (const s of network.stations) {
    if (mode && s.mode !== mode) continue;
    const km = haversineKm(point, s);
    if (!best || km < best.km) best = { station: s, km };
  }
  return best;
}
