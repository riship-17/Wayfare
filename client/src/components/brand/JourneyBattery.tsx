import { Lightning } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { PHASE_LABELS, PHASE_STAGE, type Battery } from '@wayfare/shared';
import { cn } from '@/lib/cn';
import { EASE } from '@/lib/motion';
import { EvCharging } from './Illustrations';
import { STAGE_BG } from './StageChip';

/**
 * Navy outlined battery from the poster, now ink: four cells (one per phase) filled in stage colours,
 * a bolt and a percent label. At 100% it turns Sage and shows the EV charging art.
 * Signature moment: when the value rises a charge pulse runs along it and the bolt scales 0.9 to 1.
 */
export function JourneyBattery({ battery, size = 'md', showArt = true, className }: { battery: Battery; size?: 'sm' | 'md'; showArt?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const prev = useRef(battery.percent);
  const [pulse, setPulse] = useState(0);
  const full = battery.percent >= 100;

  useEffect(() => {
    if (battery.percent > prev.current) setPulse((p) => p + 1);
    prev.current = battery.percent;
  }, [battery.percent]);

  const label = `Journey ${battery.percent}% charged. ${battery.cells.map((c) => `${PHASE_LABELS[c.phase]}: ${c.done} of ${c.applicable} done`).join('. ')}.`;
  const h = size === 'sm' ? 'h-10' : 'h-14';

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-3">
        <div role="img" aria-label={label} className={cn('relative flex flex-1 items-stretch gap-1 overflow-hidden rounded-2xl border-[2.5px] border-ink bg-white p-1', h)}>
          {battery.cells.map((c) => (
            <div key={c.phase} className="relative flex-1 overflow-hidden rounded-xl bg-white">
              <motion.div
                className={cn('absolute inset-0 origin-left rounded-xl', full ? 'bg-sage' : STAGE_BG[PHASE_STAGE[c.phase]])}
                initial={false}
                animate={{ scaleX: Math.max(c.value, 0) }}
                transition={reduce ? { duration: 0 } : { duration: 0.5, ease: EASE }}
              />
              {c.value > 0 && c.value < 1 && <div className="absolute inset-0 rounded-xl border-2 border-dashed border-hairline" aria-hidden />}
            </div>
          ))}
          {pulse > 0 && !reduce && (
            <motion.div
              key={pulse}
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-1/3 bg-white/70"
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: '320%', opacity: [0, 1, 0] }}
              transition={{ duration: 0.9, ease: EASE }}
            />
          )}
        </div>
        {/* battery terminal */}
        <div className={cn('-ms-2 w-2 rounded-e-md bg-ink', size === 'sm' ? 'h-4' : 'h-6')} aria-hidden />
        <div className="flex items-center gap-1" aria-hidden>
          <motion.span key={`bolt-${pulse}`} initial={reduce ? false : { scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.5, ease: EASE }} className="inline-flex">
            <Lightning size={20} weight="bold" />
          </motion.span>
          <span className={cn(size === 'sm' ? 'type-title' : 'type-heading-2', 'tabular-nums')}>{battery.percent}%</span>
        </div>
      </div>
      {full && showArt && (
        <div className="flex items-center gap-4 rounded-2xl bg-sage p-4">
          <EvCharging className="h-14 w-auto" />
          <p className="type-title">Fully charged</p>
        </div>
      )}
    </div>
  );
}
