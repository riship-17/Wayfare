import { Slot } from '@radix-ui/react-slot';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'onInk' | 'danger';
type Size = 'lg' | 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  asChild?: boolean;
}

const variants: Record<Variant, string> = {
  // The click accent: Cornflower fill with an ink label (6.4:1). One per screen.
  primary: 'bg-cornflower text-ink hover:bg-cornflower-hover',
  // Chip style: white with the 2.5px ink outline
  secondary: 'bg-white text-ink card-outline hover:bg-cornflower-wash',
  ghost: 'bg-transparent text-ink underline decoration-2 underline-offset-4 hover:decoration-cornflower',
  // Secondary action on ink panels
  onInk: 'bg-transparent text-white border-[2.5px] border-white hover:bg-ink-soft on-ink',
  danger: 'bg-white text-alert border-[2.5px] border-alert hover:bg-alert-wash',
};

const sizes: Record<Size, string> = {
  lg: 'min-h-12 px-6 type-button',
  md: 'min-h-11 px-4 type-button',
  sm: 'min-h-11 px-3 type-button-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'lg', block, loading, loadingLabel, asChild, className, children, disabled, ...rest },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(
        'tap inline-flex items-center justify-center gap-2 rounded-full text-center select-none',
        'disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45',
        variant !== 'ghost' && 'hover:-translate-y-px',
        variants[variant],
        variant !== 'ghost' && sizes[size],
        variant === 'ghost' && 'min-h-11 type-button-sm px-1',
        block && 'w-full',
        loading && 'pointer-events-none opacity-70',
        className,
      )}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {asChild ? children : loading && loadingLabel ? loadingLabel : children}
    </Comp>
  );
});
