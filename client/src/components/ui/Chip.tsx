import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Chip({ children, className, icon, tone = 'outline', ...rest }: HTMLAttributes<HTMLSpanElement> & { icon?: ReactNode; tone?: 'outline' | 'prepare' | 'arrive' | 'settle' | 'verified' | 'ink' | 'wash' | 'plain' }) {
  const tones = {
    outline: 'bg-white border-2 border-ink',
    plain: 'bg-white',
    prepare: 'bg-sunshine',
    arrive: 'bg-lilac',
    settle: 'bg-blush',
    verified: 'bg-sage',
    ink: 'bg-ink text-white',
    wash: 'bg-cornflower-wash',
  } as const;
  return (
    <span className={cn('inline-flex min-h-7 items-center gap-1 rounded-full px-3 py-0.5 type-caption-strong text-ink', tones[tone], tone === 'ink' && 'text-white', className)} {...rest}>
      {icon}
      {children}
    </span>
  );
}
