import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const control =
  'w-full min-h-12 rounded-2xl bg-white border-[2.5px] border-ink px-4 py-3 type-body text-ink placeholder:text-ink-muted transition-colors duration-300 ' +
  'focus-visible:outline-none focus-visible:border-cornflower focus-visible:ring-0 aria-[invalid=true]:border-alert disabled:opacity-50';

interface Shared {
  label: string;
  hint?: ReactNode;
  error?: string;
  hideLabel?: boolean;
}

function Wrap({ id, label, hint, error, hideLabel, children }: Shared & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={cn('type-label text-ink', hideLabel && 'sr-only')}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="type-body-sm text-alert" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="type-body-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Shared>(function Input({ label, hint, error, hideLabel, className, id, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Wrap id={fid} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <input ref={ref} id={fid} aria-invalid={!!error || undefined} aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined} className={cn(control, className)} {...rest} />
    </Wrap>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Shared>(function Textarea({ label, hint, error, hideLabel, className, id, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Wrap id={fid} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <textarea ref={ref} id={fid} rows={4} aria-invalid={!!error || undefined} aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined} className={cn(control, 'resize-none', className)} {...rest} />
    </Wrap>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & Shared>(function Select({ label, hint, error, hideLabel, className, id, children, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Wrap id={fid} label={label} hint={hint} error={error} hideLabel={hideLabel}>
      <select ref={ref} id={fid} aria-invalid={!!error || undefined} className={cn(control, 'appearance-none bg-[length:16px] pe-10', className)} {...rest}>
        {children}
      </select>
    </Wrap>
  );
});
