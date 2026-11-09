import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { EASE } from '@/lib/motion';

/** Signature moment: "12 days to go" rolls digit by digit when the value changes. */
export function RollingText({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={className} aria-label={text} role="text">
      {text.split('').map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className="relative inline-block overflow-hidden align-bottom tabular-nums" aria-hidden>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={`${i}-${ch}`}
                className="inline-block"
                initial={reduce ? { opacity: 0 } : { y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { y: '-100%', opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: reduce ? 0 : i * 0.04 }}
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          </span>
        ) : (
          <span key={i} aria-hidden>
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
