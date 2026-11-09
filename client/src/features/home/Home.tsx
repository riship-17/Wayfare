import { ArrowRight, CalendarBlank, IdentificationCard, Lifebuoy, ListChecks, MapPin, UsersThree, Wallet, type Icon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { EID_STATUS_LABELS, PHASE_LABELS, eidIndex } from '@wayfare/shared';
import { JourneyBattery } from '@/components/brand/JourneyBattery';
import { NeedsChip } from '@/components/brand/Badges';
import { StageChip } from '@/components/brand/StageChip';
import { Skyline } from '@/components/brand/Illustrations';
import { Card } from '@/components/ui/Card';
import { RollingText } from '@/components/ui/RollingNumber';
import { SectionTitle } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { eventWhen } from '@/lib/dates';
import { useEvents, useJourney, useMe } from '@/lib/queries';

function Tile({ to, icon: I, label }: { to: string; icon: Icon; label: string }) {
  return (
    <Link to={to} className="tap flex min-h-24 flex-col justify-between gap-3 rounded-3xl bg-white p-4 card-outline hover:bg-cornflower-wash">
      <I size={32} weight="regular" aria-hidden />
      <span className="type-title">{label}</span>
    </Link>
  );
}

export function Home() {
  const { t } = useTranslation();
  const me = useMe();
  const journey = useJourney();
  const events = useEvents();
  const user = me.data?.user;
  const j = journey.data;
  const firstName = user?.name.split(' ')[0] ?? '';

  if (journey.isPending) {
    return (
      <div className="flex flex-col gap-6 px-4 pt-6" role="status">
        <span className="sr-only">Loading your journey</span>
        <Skeleton className="h-10 w-1/2 rounded-full" />
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }
  if (journey.isError || !j) return <div className="px-4 pt-6"><ErrorState error={journey.error} onRetry={() => journey.refetch()} /></div>;

  const next = j.tasks.find((x) => x.key === j.nextStepKey);
  const eidLocked = j.tasks.filter((x) => x.missing.includes('emirates_id') && x.status === 'todo');
  const hasCard = eidIndex(j.eidStatus) >= eidIndex('card_received');
  const dayZeroReady = j.tasks.filter((x) => x.availability === 'available' && x.status === 'todo' && (x.phase === 'arrival' || x.phase === 'before_arrival')).length;

  return (
    <div className="grid grid-cols-1 gap-6 px-4 pt-6 lg:grid-cols-2">
      <header className="flex flex-col gap-2 lg:col-span-2">
        <StageChip stage={j.stage} className="self-start" />
        <h1 className="type-display">{t('home.hi', { name: firstName })}</h1>
        <RollingText text={j.countdown} className="type-heading-3 text-ink-muted" />
      </header>

      <Card aria-labelledby="battery-title" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="battery-title" className="type-title">{t('home.phase')}</h2>
          <span className="type-body-sm text-ink-muted">{PHASE_LABELS[j.phase]}</span>
        </div>
        <JourneyBattery battery={j.battery} />
      </Card>

      {next ? (
        <Card tone="ink" aria-labelledby="next-title" className="flex flex-col gap-4">
          <p id="next-title" className="type-overline text-white">{t('home.nextStep')}</p>
          <p className="type-heading-2 text-white">{next.title}</p>
          <p className="type-body-sm text-white">{next.summary}</p>
          <Link
            to={`/app/journey/${next.key}`}
            data-testid="next-step"
            className="tap inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-cornflower px-6 type-button text-ink hover:bg-cornflower-hover"
          >
            Start this step
            <ArrowRight size={20} weight="bold" aria-hidden />
          </Link>
        </Card>
      ) : (
        <Card tone="verified">
          <p className="type-title">{j.battery.percent >= 100 ? t('journey.complete') : t('home.allDone')}</p>
        </Card>
      )}

      <Card aria-labelledby="eid-title" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <IdentificationCard size={32} weight="regular" aria-hidden />
          <div className="flex flex-col">
            <h2 id="eid-title" className="type-title">{t('home.eidTitle')}</h2>
            <span className="type-body-sm text-ink-muted">{EID_STATUS_LABELS[j.eidStatus]}</span>
          </div>
        </div>
        {hasCard ? (
          <p className="type-body-sm">{t('home.eidReceived')}</p>
        ) : (
          <>
            <p className="type-body-sm">{t('home.eidWaiting')}</p>
            <p className="type-caption text-ink-muted">{t('home.eidEstimate')}</p>
            {eidLocked.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <NeedsChip requirement="emirates_id" locked />
                <span className="type-caption text-ink-muted">{eidLocked.length} tasks wait for it</span>
              </div>
            )}
            <Link to="/app/journey" className="tap inline-flex min-h-11 items-center gap-2 self-start rounded-full type-button-sm underline decoration-2 underline-offset-4">
              {t('home.eidWorksToday')}
              {dayZeroReady > 0 && <span className="rounded-full bg-sage px-2 type-caption-strong no-underline">{dayZeroReady}</span>}
            </Link>
          </>
        )}
      </Card>

      <section aria-labelledby="tiles-title" className="flex flex-col gap-4">
        <SectionTitle id="tiles-title">{t('home.tiles')}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-2">
          <Tile to="/app/budget" icon={Wallet} label={t('home.budget')} />
          <Tile to="/app/essentials" icon={Lifebuoy} label={t('home.essentials')} />
          <Tile to="/app/community" icon={UsersThree} label={t('home.community')} />
          <Tile to="/app/journey" icon={ListChecks} label={t('home.checklist')} />
        </div>
      </section>

      <section aria-labelledby="events-title" className="flex flex-col gap-4">
        <SectionTitle id="events-title">{t('home.events')}</SectionTitle>
        {events.isPending ? (
          <Skeleton className="h-24 rounded-3xl" />
        ) : events.isError ? (
          <ErrorState error={events.error} onRetry={() => events.refetch()} />
        ) : events.data.length === 0 ? (
          <EmptyState title={t('home.noEvents')} art="none" />
        ) : (
          <ul className="flex flex-col gap-3">
            {events.data.slice(0, 3).map((e) => (
              <li key={e.id}>
                <Link to="/app/community" className="tap flex items-start gap-4 rounded-3xl bg-white p-4 card-outline hover:bg-cornflower-wash">
                  <CalendarBlank size={32} weight="regular" aria-hidden className="shrink-0" />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="type-title">{e.title}</span>
                    <span className="type-body-sm text-ink-muted">{eventWhen(e.startsAt)}</span>
                    <span className="inline-flex items-center gap-1 type-caption text-ink-muted">
                      <MapPin size={14} weight="bold" aria-hidden />
                      {e.place}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="-mx-4 flex flex-col items-center gap-2 pt-6 lg:col-span-2 lg:mx-0">
        <p className="type-body-sm text-ink-muted">{t('brand.line')}</p>
        <Skyline className="h-14" />
      </div>
    </div>
  );
}
