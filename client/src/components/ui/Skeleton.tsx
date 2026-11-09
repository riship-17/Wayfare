import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-2xl', className)} />;
}

/** A card shaped skeleton, used while lists load. */
export function SkeletonCard({ lines = 2, media = false }: { lines?: number; media?: boolean }) {
  return (
    <div aria-hidden className="rounded-3xl border-[2.5px] border-hairline bg-white p-6">
      {media && <Skeleton className="mb-4 h-32 w-full rounded-2xl" />}
      <Skeleton className="mb-3 h-5 w-2/3 rounded-full" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('mb-2 h-4 rounded-full', i === lines - 1 ? 'w-1/2' : 'w-full')} />
      ))}
    </div>
  );
}

export function LoadingList({ count = 3, media = false, label = 'Loading' }: { count?: number; media?: boolean; label?: string }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} media={media} />
      ))}
    </div>
  );
}
