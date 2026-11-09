import { cn } from '@/lib/cn';

/** Single choice as a row of chips. Uses radio semantics. */
export function Segmented<T extends string>({ label, value, options, onChange, className }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <fieldset className={cn('flex flex-col gap-2', className)}>
      <legend className="type-label mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'tap inline-flex min-h-11 cursor-pointer items-center rounded-full border-[2.5px] border-ink px-4 type-button-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink',
              value === o.value ? 'bg-ink text-white' : 'bg-white hover:bg-cornflower-wash',
            )}
          >
            <input type="radio" className="sr-only" name={label} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
