import { cn } from '@/lib/cn';

/** The Wayfare pin. Only ink, white or cornflower (brand section 05). Minimum 24px high on screen. */
export function WayfarePin({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 24 32" className={cn('h-6 w-auto shrink-0', className)} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 0C5.373 0 0 5.373 0 12c0 7.2 8.4 15.6 11.2 19.6a1 1 0 0 0 1.6 0C15.6 27.6 24 19.2 24 12 24 5.373 18.627 0 12 0Zm0 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
      />
    </svg>
  );
}

/** Pin plus wordmark in Poppins Bold. Clear space around it equals the pin width. */
export function WayfareLogo({ className, size = 'md', tone = 'ink' }: { className?: string; size?: 'sm' | 'md' | 'lg'; tone?: 'ink' | 'white' | 'cornflower' }) {
  const color = tone === 'white' ? 'text-white' : tone === 'cornflower' ? 'text-cornflower' : 'text-ink';
  const text = size === 'lg' ? 'type-heading-1' : size === 'sm' ? 'type-title' : 'type-heading-2';
  const pin = size === 'lg' ? 'h-9' : size === 'sm' ? 'h-6' : 'h-7';
  return (
    <span className={cn('inline-flex items-center gap-2 font-bold', color, className)} role="img" aria-label="Wayfare">
      <WayfarePin className={pin} />
      <span className={cn(text, 'leading-none font-bold')} aria-hidden>
        Wayfare
      </span>
    </span>
  );
}
