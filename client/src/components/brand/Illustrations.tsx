import { cn } from '@/lib/cn';

export function Skyline({ className, decorative = true }: { className?: string; decorative?: boolean }) {
  return (
    <img
      src="/illustrations/dubai-skyline-line.png"
      alt={decorative ? '' : 'Line drawing of the Dubai skyline with the metro, Burj Al Arab, Dubai Frame and an electric car charging'}
      className={cn('pointer-events-none w-full select-none object-cover object-left', className)}
      loading="lazy"
      decoding="async"
    />
  );
}

export function EvCharging({ className, decorative = true }: { className?: string; decorative?: boolean }) {
  return (
    <img
      src="/illustrations/ev-charging.png"
      alt={decorative ? '' : 'An electric car plugged into a charging point'}
      className={cn('pointer-events-none select-none', className)}
      width={604}
      height={323}
      decoding="async"
    />
  );
}
