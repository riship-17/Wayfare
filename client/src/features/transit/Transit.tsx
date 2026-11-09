import { AirplaneLanding, ArrowSquareOut, Crosshair, ArrowsDownUp, CreditCard, PersonSimpleWalk, Student, Train, Warning } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { nearestStation, planRoute, type RouteResult, type TransitNetwork } from '@wayfare/shared';
import { currentPosition } from '@/lib/geo';
import { OfflineChip } from '@/components/brand/Badges';
import { SchematicMap } from '@/components/transit/SchematicMap';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { ScreenHeader, SectionTitle } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { useOnline } from '@/lib/offline';
import { useInstitutions, useMe, useNetwork } from '@/lib/queries';

const AIRPORT = 'metro-airport-terminal-1';
const FALLBACK_CAMPUS = 'metro-dubai-internet-city';

function StationSelect({ network, label, value, onChange }: { network: TransitNetwork; label: string; value: string; onChange: (v: string) => void }) {
  const byLine = network.lines.map((l) => ({
    line: l,
    stations: l.stationIds.map((id) => network.stations.find((s) => s.stationId === id)!).filter(Boolean),
  }));
  const seen = new Set<string>();
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose a station</option>
      {byLine.map(({ line, stations }) => (
        <optgroup key={line.lineId} label={line.name}>
          {stations
            .filter((s) => (seen.has(s.stationId) ? false : (seen.add(s.stationId), true)))
            .map((s) => (
              <option key={s.stationId} value={s.stationId}>
                {s.name}
              </option>
            ))}
        </optgroup>
      ))}
    </Select>
  );
}

function RouteSteps({ route }: { route: RouteResult }) {
  const { t } = useTranslation();
  return (
    <Card className="flex flex-col gap-4" aria-live="polite">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="type-heading-3">{route.from} to {route.to}</h2>
      </div>
      <p className="type-heading-2">{t('transit.minutes', { min: route.minutes })}</p>
      <ol className="flex flex-col gap-4" aria-label={t('transit.steps')}>
        {route.steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            {s.kind === 'ride' ? (
              <>
                <span className="mt-1 h-auto w-2 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
                <div className="flex flex-col gap-1">
                  <p className="type-title">{t('transit.ride', { line: s.lineName, towards: s.towards })}</p>
                  <p className="type-body-sm">
                    {s.from} to {s.to} · {t('transit.stops', { count: s.stops })} · {t('transit.minutes', { min: s.minutes })}
                  </p>
                </div>
              </>
            ) : s.kind === 'change' ? (
              <>
                <ArrowsDownUp size={20} weight="bold" aria-hidden className="mt-0.5 shrink-0" />
                <p className="type-body-sm">{t('transit.change', { at: s.at, line: s.toLineName })}</p>
              </>
            ) : (
              <>
                <PersonSimpleWalk size={20} weight="bold" aria-hidden className="mt-0.5 shrink-0" />
                <p className="type-body-sm">{t('transit.walk', { to: s.to, min: s.minutes })}</p>
              </>
            )}
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-1 rounded-2xl bg-cornflower-wash p-4">
        <p className="type-title">{route.fare.kind === 'zones' ? t('transit.fareZones', { amount: route.fare.amountAed.toFixed(2).replace('.00', '') }) : t('transit.fareRange')}</p>
        <a href="https://www.rta.ae" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 self-start type-body-sm underline underline-offset-2">
          {t('transit.fareLink')}
          <ArrowSquareOut size={14} weight="bold" aria-label="opens in a new tab" />
        </a>
      </div>
      <p className="type-caption text-ink-muted">Times are estimates from distance. {t('common.checkOfficial')}</p>
    </Card>
  );
}

export function Transit() {
  const { t } = useTranslation();
  const online = useOnline();
  const network = useNetwork();
  const me = useMe();
  const institutions = useInstitutions();
  const uni = institutions.data?.find((i) => i.id === me.data?.user?.institutionId);
  const campus = uni?.nearestTransit.find((n) => n.mode === 'metro')?.stationId ?? FALLBACK_CAMPUS;
  const campusTram = uni?.nearestTransit.find((n) => n.mode === 'tram')?.stationId;
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  /** Location stays on the device: it only picks the nearest station and is never sent anywhere. */
  const nearMe = async () => {
    if (!network.data) return;
    setLocating(true);
    setError(null);
    try {
      const here = await currentPosition();
      const hit = nearestStation(network.data, here);
      if (hit) setFrom(hit.station.stationId);
    } catch {
      setError('We could not get your location. Pick your station from the list.');
    } finally {
      setLocating(false);
    }
  };

  const campusName = useMemo(() => network.data?.stations.find((s) => s.stationId === campus)?.name ?? 'campus', [network.data, campus]);

  const plan = (a: string, b: string) => {
    setError(null);
    if (!network.data) return;
    if (!a || !b || a === b) {
      setRoute(null);
      return setError(t('transit.same'));
    }
    const r = planRoute(network.data, a, b);
    if (!r) setError(t('transit.noRoute'));
    setRoute(r);
  };

  return (
    <div className="flex flex-col gap-6 px-4">
      <ScreenHeader title={t('transit.title')} sub={t('transit.sub')} action={<OfflineChip online={online} className="mt-1 shrink-0" />} />
      {network.isPending ? (
        <Skeleton className="aspect-[25/16] w-full rounded-3xl" />
      ) : network.isError || !network.data ? (
        <ErrorState error={network.error} onRetry={() => network.refetch()} />
      ) : (
        <>
          <Card tone="ink" className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-white">
              <AirplaneLanding size={32} weight="regular" aria-hidden />
              <div>
                <p className="type-heading-3 text-white">{t('transit.preset')}</p>
                <p className="type-body-sm text-white">{t('transit.presetSub', { campus: uni?.name ?? campusName })}</p>
              </div>
            </div>
            <Button
              block
              data-testid="preset-airport"
              onClick={() => {
                setFrom(AIRPORT);
                setTo(campus);
                plan(AIRPORT, campus);
              }}
            >
              <Train size={20} weight="bold" aria-hidden />
              Terminal 1 to {campusName}
            </Button>
          </Card>

          {route && <RouteSteps route={route} />}
          {error && (
            <p role="alert" className="rounded-2xl border-[2.5px] border-alert p-4 type-body-sm text-alert">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
          <SchematicMap network={network.data} route={route?.stationIds} highlight={[campus, ...(campusTram ? [campusTram] : []), AIRPORT, 'metro-airport-terminal-3']} />

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              plan(from, to);
            }}
          >
            <SectionTitle>Plan a trip</SectionTitle>
            <StationSelect network={network.data} label={t('transit.from')} value={from} onChange={setFrom} />
            <Button type="button" variant="ghost" className="self-start" onClick={nearMe} loading={locating} loadingLabel="Finding your station">
              <Crosshair size={20} weight="bold" aria-hidden />
              Nearest station to me
            </Button>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setFrom(to);
                  setTo(from);
                }}
                className="tap inline-flex size-11 items-center justify-center rounded-full bg-white card-outline hover:bg-cornflower-wash"
                aria-label={t('transit.swap')}
              >
                <ArrowsDownUp size={20} weight="bold" aria-hidden />
              </button>
            </div>
            <StationSelect network={network.data} label={t('transit.to')} value={to} onChange={setTo} />
            <Button type="submit" variant="secondary" block>
              {t('transit.plan')}
            </Button>
          </form>
          </div>

          <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <li className="flex items-start gap-3 rounded-3xl bg-sunshine p-4">
              <CreditCard size={20} weight="bold" aria-hidden className="mt-0.5 shrink-0" />
              <span className="type-body-sm-strong">{t('transit.tipNol')}</span>
            </li>
            <li className="flex items-start gap-3 rounded-3xl bg-blush p-4">
              <Student size={20} weight="bold" aria-hidden className="mt-0.5 shrink-0" />
              <span className="type-body-sm-strong">{t('transit.tipStudent')}</span>
            </li>
            <li className="flex items-start gap-3 rounded-3xl bg-white p-4 card-outline">
              <Warning size={20} weight="bold" aria-hidden className="mt-0.5 shrink-0" />
              <span className="type-body-sm-strong">{t('transit.tipT2')}</span>
            </li>
          </ul>
          <p className="type-caption text-ink-muted">
            <a href={network.data.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {t('transit.credit')}
            </a>
            {' · '}Fetched {network.data.source.fetchedOn}
          </p>
        </>
      )}
    </div>
  );
}
