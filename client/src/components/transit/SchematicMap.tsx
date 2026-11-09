import { ArrowsIn, MagnifyingGlassMinus, MagnifyingGlassPlus } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { TransitNetwork } from '@wayfare/shared';
import { EASE } from '@/lib/motion';

const W = 1000;
const H = 640;
const PAD = 60;

/**
 * Generated from the imported network: stations are placed by their real coordinates
 * (rotated so the Red Line runs across the screen), lines are drawn as straight segments in stop order.
 */
export function useProjection(network: TransitNetwork) {
  return useMemo(() => {
    const lat0 = network.stations.reduce((s, x) => s + x.lat, 0) / network.stations.length;
    const k = Math.cos((lat0 * Math.PI) / 180);
    // Rotate the network's principal axis (PCA of station positions) onto the horizontal,
    // so the long Red Line corridor runs across the map instead of diagonally.
    const pts = network.stations.map((s) => ({ id: s.stationId, x: s.lng * k, y: -s.lat }));
    const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    let sxx = 0, syy = 0, sxy = 0;
    for (const p of pts) {
      sxx += (p.x - mx) ** 2;
      syy += (p.y - my) ** 2;
      sxy += (p.x - mx) * (p.y - my);
    }
    const a = -0.5 * Math.atan2(2 * sxy, sxx - syy);
    const raw = pts.map((p) => ({ id: p.id, x: (p.x - mx) * Math.cos(a) - (p.y - my) * Math.sin(a), y: (p.x - mx) * Math.sin(a) + (p.y - my) * Math.cos(a) }));
    const minX = Math.min(...raw.map((p) => p.x));
    const maxX = Math.max(...raw.map((p) => p.x));
    const minY = Math.min(...raw.map((p) => p.y));
    const maxY = Math.max(...raw.map((p) => p.y));
    const scale = Math.min((W - PAD * 2) / (maxX - minX), (H - PAD * 2) / (maxY - minY));
    const offX = (W - (maxX - minX) * scale) / 2;
    const offY = (H - (maxY - minY) * scale) / 2;
    return new Map(raw.map((p) => [p.id, { x: offX + (p.x - minX) * scale, y: offY + (p.y - minY) * scale }]));
  }, [network]);
}

const KEY_STATIONS = /airport terminal|internet city|knowledge village|union|burjuman|centrepoint|expo city|life pharmacy|creek|^e&$|dmcc|sobha|jumeirah lakes|dubai marina$/i;

export function SchematicMap({ network, route, highlight = [] }: { network: TransitNetwork; route?: string[] | null; highlight?: string[] }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const pos = useProjection(network);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; s: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const clamp = (s: number) => Math.min(4, Math.max(1, s));
  const zoomBy = (f: number) => setView((v) => {
    const s = clamp(v.s * f);
    return s === 1 ? { s, x: 0, y: 0 } : { ...v, s };
  });

  const onDown = (e: RPointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y), s: view.s };
    }
  };
  const onMove = (e: RPointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [p1, p2] = [...pointers.current.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const s = clamp((pinch.current.s * d) / pinch.current.d);
      setView((v) => ({ ...v, s }));
    } else if (pointers.current.size === 1 && view.s > 1) {
      const rect = box.current?.getBoundingClientRect();
      const unit = rect ? W / rect.width : 1;
      setView((v) => ({ ...v, x: v.x + (e.clientX - prev.x) * unit, y: v.y + (e.clientY - prev.y) * unit }));
    }
  };
  const onUp = (e: RPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const interchanges = new Set(network.stations.filter((s) => s.lineIds.length > 1).map((s) => s.stationId));
  for (const tr of network.transfers) {
    interchanges.add(tr.from);
    interchanges.add(tr.to);
  }
  const routeSet = new Set(route ?? []);
  const routePath = route && route.length > 1 ? route.map((id, i) => `${i ? 'L' : 'M'}${pos.get(id)!.x.toFixed(1)} ${pos.get(id)!.y.toFixed(1)}`).join(' ') : null;
  const labelAll = view.s >= 2.2;
  const fontSize = 15 / Math.sqrt(view.s);

  // Draw each physical segment once even when two branches share it (the Red Line trunk).
  const drawn = new Set<string>();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white card-outline">
      <div
        ref={box}
        className="aspect-[25/16] touch-none select-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={(e) => zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="size-full" role="img" aria-label={t('transit.mapLabel')}>
          <g style={{ transform: `translate(${W / 2}px, ${H / 2}px) scale(${view.s}) translate(${-W / 2 + view.x / view.s}px, ${-H / 2 + view.y / view.s}px)`, transition: pinch.current ? 'none' : 'transform 300ms cubic-bezier(0.22,1,0.36,1)' }}>
            {network.transfers.map((tr) => {
              const a = pos.get(tr.from)!;
              const b = pos.get(tr.to)!;
              return <line key={`${tr.from}-${tr.to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#050505" strokeWidth={3} strokeDasharray="4 6" strokeLinecap="round" />;
            })}
            {network.lines.map((line) => (
              <g key={line.lineId}>
                {line.stationIds.slice(1).map((id, i) => {
                  const from = line.stationIds[i];
                  const k = [from, id].sort().join('|');
                  if (drawn.has(k)) return null;
                  drawn.add(k);
                  const a = pos.get(from)!;
                  const b = pos.get(id)!;
                  return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={line.color} strokeWidth={route ? 6 : 9} strokeLinecap="round" opacity={route ? 0.35 : 1} />;
                })}
              </g>
            ))}
            {routePath && (
              <motion.path
                key={routePath}
                d={routePath}
                fill="none"
                stroke="#548CFF"
                strokeWidth={12}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduce ? { opacity: 0 } : { pathLength: 0 }}
                animate={reduce ? { opacity: 1 } : { pathLength: 1 }}
                transition={{ duration: reduce ? 0.3 : 0.9, ease: EASE }}
              />
            )}
            {network.stations.map((s) => {
              const p = pos.get(s.stationId)!;
              const onRoute = routeSet.has(s.stationId);
              const idx = route ? route.indexOf(s.stationId) : -1;
              const big = interchanges.has(s.stationId) || highlight.includes(s.stationId);
              const showLabel = labelAll || KEY_STATIONS.test(s.name) || highlight.includes(s.stationId) || (onRoute && (idx === 0 || idx === (route?.length ?? 0) - 1));
              return (
                <g key={s.stationId}>
                  <motion.circle
                    cx={p.x}
                    cy={p.y}
                    r={(big ? 9 : 5.5) / Math.sqrt(view.s)}
                    fill={onRoute ? '#548CFF' : '#FFFFFF'}
                    stroke="#050505"
                    strokeWidth={3 / Math.sqrt(view.s)}
                    initial={false}
                    animate={onRoute && !reduce ? { scale: [0.4, 1], opacity: [0, 1] } : { scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: EASE, delay: onRoute && !reduce ? Math.min(idx * 0.06, 0.4) : 0 }}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                  />
                  {showLabel && (
                    <text x={p.x + 12 / Math.sqrt(view.s)} y={p.y + 5 / Math.sqrt(view.s)} fontSize={fontSize} fontWeight={600} fill="#050505" stroke="#FFFFFF" strokeWidth={4 / Math.sqrt(view.s)} paintOrder="stroke" fontFamily="Poppins, sans-serif">
                      {s.name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <div className="absolute end-3 top-3 flex flex-col gap-2">
        <button type="button" onClick={() => zoomBy(1.4)} className="tap flex size-11 items-center justify-center rounded-full bg-white card-outline hover:bg-cornflower-wash" aria-label={t('transit.zoomIn')}>
          <MagnifyingGlassPlus size={20} weight="bold" aria-hidden />
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.4)} className="tap flex size-11 items-center justify-center rounded-full bg-white card-outline hover:bg-cornflower-wash" aria-label={t('transit.zoomOut')}>
          <MagnifyingGlassMinus size={20} weight="bold" aria-hidden />
        </button>
        {view.s > 1 && (
          <button type="button" onClick={() => setView({ s: 1, x: 0, y: 0 })} className="tap flex size-11 items-center justify-center rounded-full bg-white card-outline hover:bg-cornflower-wash" aria-label={t('transit.resetMap')}>
            <ArrowsIn size={20} weight="bold" aria-hidden />
          </button>
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 border-t-2 border-hairline px-4 py-3" aria-label="Lines">
        {network.lines.map((l) => (
          <li key={l.lineId} className="inline-flex items-center gap-2 type-caption">
            <span className="h-1.5 w-6 rounded-full" style={{ background: l.color }} aria-hidden />
            {l.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
