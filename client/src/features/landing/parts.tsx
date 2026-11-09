import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PhoneFrame } from '@/components/brand/PhoneFrame';
import { cn } from '@/lib/cn';
import { EASE } from '@/lib/motion';

/** Sections rise 32px and fade in once, over 700ms, with whileInView (no scroll listeners). */
export function Reveal({ children, className, delay = 0, as = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'li' }) {
  const reduce = useReducedMotion();
  const M = as === 'li' ? motion.li : motion.div;
  return (
    <M
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: reduce ? 0.3 : 0.7, ease: EASE, delay }}
    >
      {children}
    </M>
  );
}

/**
 * Skill B11: each word moves from 30% to full ink, one at a time, as it crosses a trigger line.
 * One IntersectionObserver watches every word; the change is an opacity transition on the base curve.
 */
export function TaglineReveal({ lines, className }: { lines: string[]; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);
  const [active, setActive] = useState<Set<number>>(new Set());
  const words = lines.flatMap((line, li) => line.split(' ').map((w, wi) => ({ w, li, wi })));

  useEffect(() => {
    if (reduce || !ref.current) return;
    const spans = [...ref.current.querySelectorAll<HTMLElement>('[data-word]')];
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).map((e) => Number((e.target as HTMLElement).dataset.word));
        if (!hit.length) return;
        // Activate in reading order: everything up to the furthest word past the line.
        const upTo = Math.max(...hit);
        setActive((prev) => {
          const next = new Set(prev);
          for (let i = 0; i <= upTo; i++) next.add(i);
          return next;
        });
      },
      { rootMargin: '0px 0px -40% 0px', threshold: 1 },
    );
    spans.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [reduce]);

  let i = -1;
  return (
    <p ref={ref} className={cn('type-hero-sm md:type-hero mx-auto max-w-[680px] text-center', className)}>
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split(' ').map((w, wi) => {
            i++;
            const on = reduce || active.has(i);
            return (
              <span key={wi}>
                <span data-word={i} className="inline-block transition-opacity duration-500 ease-wayfare" style={{ opacity: on ? 1 : 0.3, transitionDelay: on && !reduce ? `${(i % 4) * 60}ms` : '0ms' }}>
                  {w}
                </span>
                {wi < line.split(' ').length - 1 ? ' ' : ''}
              </span>
            );
          })}
        </span>
      ))}
      <span className="sr-only">{words.map((x) => x.w).join(' ')}</span>
    </p>
  );
}

/** The live app in a phone frame, scaled to fit narrow screens with transforms only. */
export function LivePhone({ className }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [load, setLoad] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / 411)));
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLoad(true), { rootMargin: '200px' });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);
  return (
    <div ref={box} className={cn('w-full max-w-[411px]', className)} style={{ height: 865 * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 411 }}>
        <PhoneFrame label="Live Wayfare app">
          {load ? <iframe title="Wayfare app, live" src="/app?embed=1" className="size-full border-0" loading="lazy" /> : <div className="skeleton size-full" />}
        </PhoneFrame>
      </div>
    </div>
  );
}
