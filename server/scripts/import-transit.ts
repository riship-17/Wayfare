/**
 * Imports the Dubai Metro and Tram network.
 *
 * 1. Preferred: the RTA GTFS feed at server/data/gtfs/rta_gtfs.zip (Dubai Pulse dataset rta_gtfs-open).
 * 2. Fallback: OpenStreetMap route relations via the Overpass API, cached in server/data/osm-transit-cache.json.
 *    Pass --refresh to fetch a fresh copy from Overpass.
 *
 * Writes TransitStation, TransitLine and TransitMeta, and exports client/public/offline/transit.json.
 * Station coordinates always come from the data. Never hand type them.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { haversineKm, walkMinutes, type TransitLine, type TransitNetwork, type TransitStation, type TransitTransfer } from '@wayfare/shared';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(here, '../data');
const GTFS_ZIP = path.join(DATA, 'gtfs/rta_gtfs.zip');
const OSM_CACHE = path.join(DATA, 'osm-transit-cache.json');
const OFFLINE_OUT = path.resolve(here, '../../client/public/offline/transit.json');
const OVERPASS = 'https://overpass-api.de/api/interpreter';
/** Metro and tram stations closer than this become a walking transfer. */
const TRANSFER_KM = 0.45;
/** Used only when the data has no colour for a line. Ink, from the Wayfare palette. */
const FALLBACK_COLOR = '#050505';

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// ---------------------------------------------------------------- OSM
interface OsmNode { type: 'node'; id: number; lat: number; lon: number; tags?: Record<string, string> }
interface OsmRelation { type: 'relation'; id: number; tags: Record<string, string>; members: { type: string; ref: number; role: string }[] }
type OsmElement = OsmNode | OsmRelation;

const OSM_QUERY = `[out:json][timeout:90];
relation["route"~"^(subway|tram)$"](24.7,54.9,25.4,55.6)->.r;
.r out body;
node(r.r);
out body;`;

async function fetchOsm(): Promise<OsmElement[]> {
  console.log('Fetching Dubai Metro and Tram relations from Overpass...');
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Wayfare/0.1 (student project, transit import)' },
    body: new URLSearchParams({ data: OSM_QUERY }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Overpass returned ${res.status}`);
  const body = (await res.json()) as { elements: OsmElement[] };
  writeFileSync(OSM_CACHE, JSON.stringify(body));
  return body.elements;
}

function fromOsm(elements: OsmElement[]): Omit<TransitNetwork, 'transfers' | 'version'> {
  const nodes = new Map(elements.filter((e): e is OsmNode => e.type === 'node').map((n) => [n.id, n]));
  const relations = elements.filter((e): e is OsmRelation => e.type === 'relation');

  // One direction per line: Red1 (Expo City branch), Red2 (Life Pharmacy branch), Green, Tram. Skip the Dubai Mall trolley.
  const chosen = new Map<string, OsmRelation>();
  for (const r of relations.sort((a, b) => a.id - b.id)) {
    const ref = r.tags.ref;
    if (!ref || /trolley/i.test(r.tags.name ?? '') || /trolley/i.test(r.tags['name:en'] ?? '')) continue;
    if (!chosen.has(ref)) chosen.set(ref, r);
  }

  const stations = new Map<string, TransitStation & { _n: number }>();
  const lines: TransitLine[] = [];

  for (const [ref, rel] of chosen) {
    const mode = rel.tags.route === 'tram' ? 'tram' : 'metro';
    const ordered: string[] = [];
    for (const m of rel.members) {
      if (m.type !== 'node' || !m.role.startsWith('stop')) continue;
      const n = nodes.get(m.ref);
      if (!n) continue;
      const name = (n.tags?.['name:en'] ?? n.tags?.name ?? '').trim();
      if (!name) continue;
      const id = `${mode}-${slug(name)}`;
      // The tram relation is a loop; stop at the first repeated stop.
      if (ordered.includes(id)) break;
      ordered.push(id);
      const existing = stations.get(id);
      if (existing) {
        // Same station served by several lines: average the platform nodes.
        existing.lat = (existing.lat * existing._n + n.lat) / (existing._n + 1);
        existing.lng = (existing.lng * existing._n + n.lon) / (existing._n + 1);
        existing._n += 1;
      } else {
        stations.set(id, { stationId: id, name, nameAr: n.tags?.['name:ar'] ?? null, mode, lineIds: [], lat: n.lat, lng: n.lon, zone: null, _n: 1 });
      }
    }
    const lineId = slug(ref);
    const terminus = stations.get(ordered[ordered.length - 1])?.name ?? '';
    const name = mode === 'tram' ? 'Dubai Tram' : ref.startsWith('Red') ? `Red Line (${terminus})` : `${ref} Line`; // Red branches renamed below
    lines.push({ lineId, name, mode, color: (rel.tags.colour ?? FALLBACK_COLOR).toUpperCase(), stationIds: ordered });
    for (const id of ordered) stations.get(id)!.lineIds.push(lineId);
  }

  // Red1 and Red2 share the trunk from Centrepoint. Name each branch by the terminus only it serves.
  const reds = lines.filter((l) => l.lineId.startsWith('red'));
  for (const l of reds) {
    const ends = [l.stationIds[0], l.stationIds[l.stationIds.length - 1]];
    const own = ends.find((e) => !reds.some((o) => o !== l && o.stationIds.includes(e))) ?? ends[1];
    l.name = `Red Line (${stations.get(own)?.name ?? ''})`;
  }

  return {
    lines,
    stations: [...stations.values()].map(({ _n, ...s }) => ({ ...s, lat: +s.lat.toFixed(6), lng: +s.lng.toFixed(6), lineIds: [...new Set(s.lineIds)] })),
    source: {
      label: '© OpenStreetMap contributors',
      url: 'https://www.openstreetmap.org/copyright',
      license: 'ODbL',
      fetchedOn: new Date().toISOString().slice(0, 10),
    },
  };
}

// ---------------------------------------------------------------- GTFS
function readCsv(zip: string, file: string): Record<string, string>[] {
  let text: string;
  try {
    text = execFileSync('unzip', ['-p', zip, file], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
  } catch {
    return [];
  }
  const rows = text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const split = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = !q;
      } else if (c === ',' && !q) {
        out.push(cur);
        cur = '';
      } else cur += c;
    }
    out.push(cur);
    return out;
  };
  const head = split(rows[0]);
  return rows.slice(1).map((r) => Object.fromEntries(split(r).map((v, i) => [head[i], v])));
}

function fromGtfs(zip: string): Omit<TransitNetwork, 'transfers' | 'version'> {
  console.log(`Reading GTFS from ${zip}`);
  const routes = readCsv(zip, 'routes.txt').filter((r) => r.route_type === '0' || r.route_type === '1');
  const trips = readCsv(zip, 'trips.txt');
  const stopTimes = readCsv(zip, 'stop_times.txt');
  const stops = new Map(readCsv(zip, 'stops.txt').map((s) => [s.stop_id, s]));
  const parentOf = (id: string) => stops.get(id)?.parent_station || id;

  const byTrip = new Map<string, { seq: number; stop: string }[]>();
  for (const st of stopTimes) {
    const list = byTrip.get(st.trip_id) ?? [];
    list.push({ seq: Number(st.stop_sequence), stop: parentOf(st.stop_id) });
    byTrip.set(st.trip_id, list);
  }

  const stations = new Map<string, TransitStation>();
  const lines: TransitLine[] = [];
  for (const r of routes) {
    const mode = r.route_type === '0' ? 'tram' : 'metro';
    // The longest trip in direction 0 gives the full ordered stop list.
    const routeTrips = trips.filter((t) => t.route_id === r.route_id && (t.direction_id ?? '0') === '0');
    let best: string[] = [];
    for (const t of routeTrips) {
      const seq = (byTrip.get(t.trip_id) ?? []).sort((a, b) => a.seq - b.seq).map((x) => x.stop);
      if (seq.length > best.length) best = seq;
    }
    if (!best.length) continue;
    const lineId = slug(r.route_short_name || r.route_long_name || r.route_id);
    const ids: string[] = [];
    for (const sid of best) {
      const s = stops.get(sid);
      if (!s) continue;
      const id = `${mode}-${slug(s.stop_name)}`;
      ids.push(id);
      const existing = stations.get(id);
      if (existing) existing.lineIds = [...new Set([...existing.lineIds, lineId])];
      else stations.set(id, { stationId: id, name: s.stop_name, nameAr: null, mode, lineIds: [lineId], lat: Number(s.stop_lat), lng: Number(s.stop_lon), zone: s.zone_id || null });
    }
    lines.push({ lineId, name: r.route_long_name || r.route_short_name, mode, color: r.route_color ? `#${r.route_color.toUpperCase()}` : FALLBACK_COLOR, stationIds: ids });
  }
  return {
    lines,
    stations: [...stations.values()],
    source: { label: 'RTA GTFS via Dubai Pulse', url: 'https://www.dubaipulse.gov.ae/data/rta-gtfs/rta_gtfs-open', license: 'Dubai Pulse open data terms', fetchedOn: new Date().toISOString().slice(0, 10) },
  };
}

// ---------------------------------------------------------------- build
function addTransfers(net: Omit<TransitNetwork, 'transfers' | 'version'>): TransitTransfer[] {
  const metro = net.stations.filter((s) => s.mode === 'metro');
  const tram = net.stations.filter((s) => s.mode === 'tram');
  const transfers: TransitTransfer[] = [];
  for (const t of tram) {
    for (const m of metro) {
      const km = haversineKm(t, m);
      if (km <= TRANSFER_KM) transfers.push({ from: m.stationId, to: t.stationId, walkMinutes: walkMinutes(km) });
    }
  }
  return transfers;
}

export async function buildNetwork(opts: { refresh?: boolean } = {}): Promise<TransitNetwork> {
  let base: Omit<TransitNetwork, 'transfers' | 'version'>;
  if (existsSync(GTFS_ZIP)) base = fromGtfs(GTFS_ZIP);
  else {
    let elements: OsmElement[];
    if (opts.refresh || !existsSync(OSM_CACHE)) elements = await fetchOsm();
    else {
      console.log(`Using cached OpenStreetMap data from ${path.relative(process.cwd(), OSM_CACHE)} (pass --refresh to fetch again)`);
      elements = (JSON.parse(readFileSync(OSM_CACHE, 'utf8')) as { elements: OsmElement[] }).elements;
    }
    base = fromOsm(elements);
  }
  const transfers = addTransfers(base);
  const network: TransitNetwork = { ...base, transfers, version: '' };
  network.version = `${base.source.fetchedOn}-${base.stations.length}-${base.lines.length}`;
  return network;
}

/** Builds the network and writes it to MongoDB and the offline file. Expects an open connection. */
export async function importTransit(opts: { refresh?: boolean; quiet?: boolean } = {}): Promise<TransitNetwork> {
  const { TransitLine: LineModel, TransitMeta, TransitStation: StationModel } = await import('../src/models');
  const { invalidateTransitCache } = await import('../src/services/transit');
  const network = await buildNetwork(opts);
  mkdirSync(path.dirname(OFFLINE_OUT), { recursive: true });
  writeFileSync(OFFLINE_OUT, JSON.stringify(network));
  await Promise.all([StationModel.deleteMany({}), LineModel.deleteMany({})]);
  await StationModel.insertMany(network.stations.map((s) => ({ ...s, location: { type: 'Point', coordinates: [s.lng, s.lat] } })));
  await LineModel.insertMany(network.lines);
  await TransitMeta.findByIdAndUpdate('network', { version: network.version, transfers: network.transfers, source: network.source }, { upsert: true });
  invalidateTransitCache();
  if (!opts.quiet) {
    for (const l of network.lines) console.log(`  ${l.name.padEnd(28)} ${String(l.stationIds.length).padStart(3)} stops  ${l.color}`);
    console.log(`  ${network.stations.length} stations, ${network.transfers.length} metro to tram walking links`);
    console.log(`Wrote ${path.relative(process.cwd(), OFFLINE_OUT)}`);
  }
  return network;
}

async function main() {
  const { connectDb, disconnectDb } = await import('../src/db');
  const { env } = await import('../src/env');
  await connectDb(env.MONGODB_URI);
  await importTransit({ refresh: process.argv.includes('--refresh') });
  await disconnectDb();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
