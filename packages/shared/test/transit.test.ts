import { describe, expect, it } from 'vitest';
import { estimateFare, fareForZones, haversineKm, planRoute, walkMinutes, type TransitNetwork } from '../src';

const net: TransitNetwork = {
  version: 't',
  source: { label: 'test', url: 'https://example.org', license: 'test', fetchedOn: '2026-11-09' },
  lines: [
    { lineId: 'red', name: 'Red Line', mode: 'metro', color: '#CC0000', stationIds: ['a', 'b', 'c', 'd'] },
    { lineId: 'green', name: 'Green Line', mode: 'metro', color: '#00CC00', stationIds: ['x', 'b', 'y'] },
    { lineId: 'tram', name: 'Dubai Tram', mode: 'tram', color: '#F28E00', stationIds: ['t1', 't2'] },
  ],
  stations: [
    { stationId: 'a', name: 'A', mode: 'metro', lineIds: ['red'], lat: 25.0, lng: 55.0 },
    { stationId: 'b', name: 'B', mode: 'metro', lineIds: ['red', 'green'], lat: 25.01, lng: 55.0 },
    { stationId: 'c', name: 'C', mode: 'metro', lineIds: ['red'], lat: 25.02, lng: 55.0 },
    { stationId: 'd', name: 'D', mode: 'metro', lineIds: ['red'], lat: 25.03, lng: 55.0 },
    { stationId: 'x', name: 'X', mode: 'metro', lineIds: ['green'], lat: 25.01, lng: 54.99 },
    { stationId: 'y', name: 'Y', mode: 'metro', lineIds: ['green'], lat: 25.01, lng: 55.01 },
    { stationId: 't1', name: 'T1', mode: 'tram', lineIds: ['tram'], lat: 25.031, lng: 55.0 },
    { stationId: 't2', name: 'T2', mode: 'tram', lineIds: ['tram'], lat: 25.04, lng: 55.0 },
  ],
  transfers: [{ from: 'd', to: 't1', walkMinutes: 3 }],
};

describe('geometry', () => {
  it('measures distance', () => {
    expect(haversineKm({ lat: 25, lng: 55 }, { lat: 25.01, lng: 55 })).toBeCloseTo(1.112, 2);
  });
  it('turns distance into walking minutes, at least one', () => {
    expect(walkMinutes(0)).toBe(1);
    expect(walkMinutes(0.5)).toBe(8);
    expect(walkMinutes(1)).toBe(16);
  });
});

describe('fares', () => {
  it('follows the Silver nol zone table', () => {
    expect(fareForZones(1)).toBe(3);
    expect(fareForZones(2)).toBe(5);
    expect(fareForZones(3)).toBe(7.5);
  });
  it('falls back to the range without zone data', () => {
    const stations = new Map(net.stations.map((s) => [s.stationId, s]));
    expect(estimateFare(['a', 'b'], stations)).toEqual({ kind: 'range', minAed: 3, maxAed: 7.5 });
  });
  it('counts zones when every station has one', () => {
    const stations = new Map(net.stations.map((s) => [s.stationId, { ...s, zone: s.stationId < 'c' ? '1' : '2' }]));
    expect(estimateFare(['a', 'b', 'c'], stations)).toEqual({ kind: 'zones', zones: 2, amountAed: 5 });
  });
});

describe('route planner', () => {
  it('rides one line without changes', () => {
    const r = planRoute(net, 'a', 'd')!;
    expect(r.steps).toHaveLength(1);
    expect(r.steps[0]).toMatchObject({ kind: 'ride', lineId: 'red', from: 'A', to: 'D', stops: 3, towards: 'D' });
    expect(r.stationIds).toEqual(['a', 'b', 'c', 'd']);
  });
  it('gives the direction by terminus going backwards', () => {
    const r = planRoute(net, 'c', 'a')!;
    expect(r.steps[0]).toMatchObject({ towards: 'A' });
  });
  it('changes line at an interchange', () => {
    const r = planRoute(net, 'a', 'y')!;
    expect(r.steps.map((s) => s.kind)).toEqual(['ride', 'change', 'ride']);
    expect(r.steps[1]).toMatchObject({ at: 'B', toLineName: 'Green Line' });
  });
  it('walks between metro and tram', () => {
    const r = planRoute(net, 'a', 't2')!;
    expect(r.steps.map((s) => s.kind)).toEqual(['ride', 'walk', 'ride']);
  });
  it('returns null for unknown stations', () => {
    expect(planRoute(net, 'a', 'nope')).toBeNull();
  });
});
