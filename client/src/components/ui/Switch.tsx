import * as RSwitch from '@radix-ui/react-switch';
import { useId } from 'react';

export function SwitchRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex min-h-12 items-center justify-between gap-4">
      <label htmlFor={id} className="flex flex-col">
        <span className="type-title">{label}</span>
        {hint && <span className="type-body-sm text-ink-muted">{hint}</span>}
      </label>
      <RSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="tap relative h-8 w-14 shrink-0 rounded-full border-[2.5px] border-ink bg-white data-[state=checked]:bg-cornflower"
      >
        <RSwitch.Thumb className="block size-5 translate-x-1 rounded-full bg-ink transition-transform duration-300 ease-wayfare data-[state=checked]:translate-x-7" />
      </RSwitch.Root>
    </div>
  );
}
