import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** 390 × 844 frame with a 2.5px ink outline, used for the app on wide screens and on the landing page. */
export function PhoneFrame({ children, className, label = 'Wayfare app preview' }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div className={cn('relative shrink-0 rounded-[2.5rem] border-[2.5px] border-ink bg-ink p-2 shadow-float', className)} style={{ width: 390 + 21, height: 844 + 21 }} aria-label={label} role="region">
      <div className="relative size-full overflow-hidden rounded-[2rem] bg-paper">{children}</div>
    </div>
  );
}
