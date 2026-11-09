import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { PHASES, type Battery, type Requirement } from '@wayfare/shared';
import { NeedsChip, OfflineChip, VerifiedBadge } from '@/components/brand/Badges';
import { EvCharging, Skyline } from '@/components/brand/Illustrations';
import { JourneyBattery } from '@/components/brand/JourneyBattery';
import { PhoneFrame } from '@/components/brand/PhoneFrame';
import { StageChip } from '@/components/brand/StageChip';
import { WayfareLogo, WayfarePin } from '@/components/brand/WayfarePin';
import { CheckButton } from '@/components/journey/TaskRow';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { RollingText } from '@/components/ui/RollingNumber';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { LoadingList, Skeleton } from '@/components/ui/Skeleton';
import { SwitchRow } from '@/components/ui/Switch';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { RequestError } from '@/lib/api';
import { formatMoney } from '@/lib/currency';

function battery(values: number[]): Battery {
  const cells = PHASES.map((phase, i) => ({ phase, done: Math.round(values[i] * 4), applicable: 4, value: values[i] }));
  return { cells, percent: Math.round((values.reduce((a, b) => a + b, 0) / 4) * 100) };
}

function Block({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <section className="flex flex-col gap-4 border-t-2 border-hairline pt-8" aria-label={title}>
      <h2 className="type-heading-2">{title}</h2>
      {note && <p className="type-body-sm text-ink-muted">{note}</p>}
      {children}
    </section>
  );
}

const SWATCHES = [
  ['paper', '#FFFFFF', 'Page and cards'],
  ['ink', '#050505', 'Text, outlines, panels'],
  ['cornflower', '#548CFF', 'Click accent'],
  ['ink-muted', '#5C5C66', 'Secondary text on paper'],
  ['sunshine', '#FEC93B', 'Stage 1 Prepare'],
  ['lilac', '#C8B7EE', 'Stage 2 Arrive'],
  ['blush', '#F4B5C8', 'Stage 3 Settle'],
  ['sage', '#A6D6B0', 'Verified and success'],
];

export function Kit() {
  const [sheet, setSheet] = useState(false);
  const [checked, setChecked] = useState(false);
  const [sw, setSw] = useState(true);
  const [seg, setSeg] = useState('shared');
  const [b, setB] = useState([0.5, 0.25, 0, 0]);
  const [days, setDays] = useState(12);
  const [amount, setAmount] = useState(74425);

  return (
    <main id="main" className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12 md:px-6">
      <header className="flex flex-col gap-2">
        <WayfareLogo size="lg" />
        <h1 className="type-display">Component kit</h1>
        <p className="type-body text-ink-muted">Every brand and UI component in every state. Palette from reference/wayfare-brand-guidelines.png: Paper White, Ink Black, Cornflower Blue, with the pastels kept for stage meaning only.</p>
      </header>

      <Block title="Colour">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SWATCHES.map(([name, hex, use]) => (
            <li key={name} className="flex flex-col gap-2">
              <span className="h-16 rounded-2xl border-2 border-ink" style={{ background: hex }} aria-hidden />
              <span className="type-label">{name}</span>
              <span className="type-caption text-ink-muted">{hex} · {use}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Type">
        <div className="flex flex-col gap-3">
          <p className="type-hero">Hero 48</p>
          <p className="type-display">Display 36</p>
          <p className="type-heading-1">Heading 1, 30</p>
          <p className="type-heading-2">Heading 2, 24</p>
          <p className="type-heading-3">Heading 3, 20</p>
          <p className="type-title">Title 16 SemiBold</p>
          <p className="type-body">Body 16 Regular. Short sentences, one idea per line.</p>
          <p className="type-body-sm">Body small 14</p>
          <p className="type-label">Label 14 SemiBold</p>
          <p className="type-caption">Caption 12</p>
          <p className="type-overline">Overline</p>
        </div>
      </Block>

      <Block title="Brand">
        <div className="flex flex-wrap items-center gap-6">
          <WayfarePin className="h-8" title="Wayfare pin" />
          <WayfareLogo />
          <span className="rounded-3xl bg-ink p-4"><WayfareLogo tone="white" /></span>
          <span className="rounded-3xl bg-ink p-4"><WayfareLogo tone="cornflower" /></span>
        </div>
        <div className="flex flex-wrap gap-2">
          <StageChip stage="prepare" />
          <StageChip stage="arrive" />
          <StageChip stage="settle" />
        </div>
        <div className="flex flex-wrap gap-2">
          <VerifiedBadge verified institution="Heriot-Watt University Dubai" />
          <VerifiedBadge verified={false} />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['passport', 'entry_permit', 'emirates_id', 'enrolment_letter', 'ejari'] as Requirement[]).map((r) => <NeedsChip key={r} requirement={r} />)}
          <NeedsChip requirement="emirates_id" locked />
        </div>
        <div className="flex flex-wrap gap-2">
          <OfflineChip online />
          <OfflineChip online={false} savedOn="9 Nov" />
        </div>
      </Block>

      <Block title="Journey battery" note="Charge it to see the pulse and the bolt. At 100% it turns Sage with the EV art.">
        <JourneyBattery battery={battery(b)} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setB(b.map((v, i) => (i === b.findIndex((x) => x < 1) ? Math.min(1, v + 0.25) : v)))}>Charge</Button>
          <Button size="sm" variant="secondary" onClick={() => setB([1, 1, 1, 1])}>Fill</Button>
          <Button size="sm" variant="secondary" onClick={() => setB([0, 0, 0, 0])}>Empty</Button>
        </div>
        <JourneyBattery battery={battery([1, 1, 1, 1])} size="sm" />
      </Block>

      <Block title="Buttons" note="Hover, active (scale 0.98), focus ring, loading and disabled. One primary per screen.">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Text link</Button>
          <Button variant="danger">Remove</Button>
          <Button loading loadingLabel="Saving">Save</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm" variant="secondary">Small</Button>
        </div>
        <div className="on-ink flex flex-wrap gap-3 rounded-3xl bg-ink p-6">
          <Button>Primary on ink</Button>
          <Button variant="onInk">Secondary on ink</Button>
        </div>
      </Block>

      <Block title="Cards and chips">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card><p className="type-title">White card</p><p className="type-body-sm text-ink-muted">2.5px ink outline</p></Card>
          <Card tone="prepare"><p className="type-title">Prepare</p></Card>
          <Card tone="arrive"><p className="type-title">Arrive</p></Card>
          <Card tone="settle"><p className="type-title">Settle</p></Card>
          <Card tone="verified"><p className="type-title">Verified</p></Card>
          <Card tone="ink"><p className="type-title text-white">Ink panel</p></Card>
        </div>
        <div className="flex flex-wrap gap-2"><Chip>Outline chip</Chip><Chip tone="wash">Wash</Chip><Chip tone="ink">Ink</Chip></div>
      </Block>

      <Block title="Form controls">
        <div className="grid gap-6 sm:grid-cols-2">
          <Input label="Email" placeholder="you@example.com" hint="We never share it" />
          <Input label="Email" defaultValue="nope" error="Enter a valid email address" />
          <Select label="Home currency" defaultValue="INR"><option>INR</option><option>AED</option></Select>
          <Input label="Disabled" disabled defaultValue="Not editable" />
          <Textarea label="What happened" />
          <div className="flex flex-col gap-4">
            <SwitchRow label="Near metro or tram" hint="About 15 minutes walk or less" checked={sw} onChange={setSw} />
            <Segmented label="Room type" value={seg} onChange={setSeg} options={[{ value: 'shared', label: 'Shared' }, { value: 'private', label: 'Private' }, { value: 'studio', label: 'Studio' }]} />
            <div className="flex items-center gap-2"><CheckButton done={checked} onToggle={() => setChecked(!checked)} label="Checklist tick" /><span className="type-body-sm">Checklist tick (path draws)</span></div>
          </div>
        </div>
      </Block>

      <Block title="Signature motion">
        <div className="flex flex-wrap items-center gap-6">
          <RollingText text={`${days} days to go`} className="type-heading-2" />
          <Button size="sm" variant="secondary" onClick={() => setDays((d) => Math.max(1, d - 1))}>Next day</Button>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <AnimatedNumber value={amount} format={(n) => formatMoney(n, 'INR')} className="type-heading-2" />
          <Button size="sm" variant="secondary" onClick={() => setAmount((a) => (a === 74425 ? 98120 : 74425))}>Change total</Button>
        </div>
      </Block>

      <Block title="Sheet and toast">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setSheet(true)}>Open sheet</Button>
          <Button variant="secondary" onClick={() => toast('Emirates ID received. 5 tasks are ready.')}>Show toast</Button>
        </div>
        <Sheet open={sheet} onOpenChange={setSheet} title="Share with family" description="A read only link to this budget." footer={<Button block onClick={() => setSheet(false)}>Create link</Button>}>
          <p className="type-body">Sheet content.</p>
        </Sheet>
      </Block>

      <Block title="States" note="Skeletons shaped like the content, never spinners.">
        <LoadingList count={1} media />
        <Skeleton className="h-6 w-1/2 rounded-full" />
        <EmptyState title="No events yet. Your university posts them here." />
        <EmptyState title="Fully charged. You're settled in." art="ev" />
        <ErrorState message="Could not load places to live. Check your connection and try again." onRetry={() => toast('Retrying')} />
        <ErrorState error={new RequestError(0, 'offline', 'offline')} onRetry={() => undefined} />
      </Block>

      <Block title="Illustrations and frame">
        <Skyline className="h-16" decorative={false} />
        <EvCharging className="h-24 w-auto" decorative={false} />
        <div className="origin-top-left scale-50" style={{ height: 432 }}>
          <PhoneFrame><div className="flex size-full items-center justify-center"><WayfareLogo size="lg" /></div></PhoneFrame>
        </div>
      </Block>
    </main>
  );
}
