import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

/** Signature moment: totals count to the new value when the home currency changes. */
export function AnimatedNumber({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, { duration: 0.8, ease: [0.22, 1, 0.36, 1], onUpdate: setShown });
    from.current = value;
    return () => controls.stop();
  }, [value, reduce]);
  return (
    <span className={className}>
      <span aria-hidden className="tabular-nums">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
