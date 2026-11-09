import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'white' | 'prepare' | 'arrive' | 'settle' | 'verified' | 'ink' | 'wash';

const tones: Record<Tone, string> = {
  white: 'bg-white card-outline',
  prepare: 'bg-sunshine',
  arrive: 'bg-lilac',
  settle: 'bg-blush',
  verified: 'bg-sage',
  ink: 'bg-ink text-white on-ink',
  wash: 'bg-cornflower-wash',
};

export function Card({ tone = 'white', className, as: As = 'div', ...rest }: HTMLAttributes<HTMLElement> & { tone?: Tone; as?: 'div' | 'section' | 'article' | 'li' | 'aside' }) {
  return <As className={cn('rounded-3xl p-6', tones[tone], className)} {...rest} />;
}
