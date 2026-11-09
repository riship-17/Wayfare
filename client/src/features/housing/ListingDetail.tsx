import { useQueryClient } from '@tanstack/react-query';
import { ArrowSquareOut, BookmarkSimple, Check, ShieldWarning, Train } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ROOM_TYPE_LABELS } from '@wayfare/shared';
import { VerifiedBadge } from '@/components/brand/Badges';
import { ListingVisual, PriceLine, TransitChip } from '@/components/housing/ListingParts';
import { ReportSheet } from '@/components/housing/ReportSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingList } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { errorMessage } from '@/lib/api';
import { approxHome, formatAed } from '@/lib/currency';
import { findCachedListing, useListing, useMe, useRates, useToggleSaved, useUpdateMe, useViewingRequest } from '@/lib/queries';

function List({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="type-heading-3">{title}</h2>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((i) => (
            <li key={i} className="flex items-start gap-2 type-body">
              <Check size={20} weight="bold" aria-hidden className="mt-0.5 shrink-0" />
              {i}
            </li>
          ))}
        </ul>
      ) : (
        <p className="type-body-sm text-ink-muted">{empty}</p>
      )}
    </section>
  );
}

export function ListingDetail() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const me = useMe();
  const rates = useRates();
  const q = useListing(id, () => findCachedListing(qc, id));
  const save = useToggleSaved();
  const choose = useUpdateMe();
  const viewing = useViewingRequest(id);
  const [reportOpen, setReportOpen] = useState(false);
  const user = me.data?.user;
  const l = q.data?.listing;

  if (q.isPending) return <div className="px-4 pt-6"><LoadingList count={2} media /></div>;
  if (q.isError || !l) return <div className="flex flex-col gap-6 px-4"><ScreenHeader back="/app/housing" title={t('housing.title')} /><ErrorState error={q.error} message={t('housing.loadError')} onRetry={() => q.refetch()} /></div>;

  const verified = l.verification.status === 'verified';
  const saved = user?.savedListingIds.includes(l.id);
  const chosen = user?.chosenListingId === l.id;
  const currency = user?.homeCurrency ?? 'AED';

  return (
    <article className="flex max-w-3xl flex-col gap-6 px-4">
      <ScreenHeader back="/app/housing" title={l.title} sub={`${l.providerName} · ${l.area}`} />
      <ListingVisual listing={l} zoom="enter" className="h-56" />
      <div className="flex flex-col gap-3">
        <VerifiedBadge verified={verified} institution={l.verification.verifiedByName} className="self-start" />
        <PriceLine listing={l} currency={currency} rates={rates.data?.rates} large />
        {verified && l.verification.checkedOn && (
          <p className="type-caption text-ink-muted">
            Price checked on {l.verification.checkedOn}
            {l.verification.sourceUrl && (
              <>
                {' · '}
                <a className="underline underline-offset-2" href={l.verification.sourceUrl} target="_blank" rel="noreferrer">
                  {t('common.source')}
                </a>
              </>
            )}
          </p>
        )}
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="type-heading-3">Rooms</h2>
        <ul className="flex flex-col divide-y-2 divide-hairline">
          {l.roomTypes.map((r) => (
            <li key={r.type} className="flex items-start justify-between gap-4 py-3">
              <span className="type-title">{ROOM_TYPE_LABELS[r.type]}</span>
              <span className="flex flex-col items-end text-end">
                <span className="type-title">{r.priceAedMonthly !== null ? t('housing.perMonth', { price: r.priceAedMonthly.toLocaleString('en-GB') }) : t('common.askForPrice')}</span>
                {r.priceAedMonthly !== null && approxHome(r.priceAedMonthly, currency, rates.data?.rates) && <span className="type-caption text-ink-muted">{approxHome(r.priceAedMonthly, currency, rates.data?.rates)}</span>}
                {r.depositAed !== null && <span className="type-caption text-ink-muted">{t('housing.deposit')} {formatAed(r.depositAed)}</span>}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <List title={t('housing.included')} items={[...l.billsIncluded, ...l.amenities]} empty={t('housing.notProvided')} />
      <List title={t('housing.rules')} items={l.houseRules} empty={t('housing.notProvided')} />

      <Card tone="arrive" className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 type-heading-3">
          <Train size={20} weight="bold" aria-hidden />
          {t('housing.location')}
        </h2>
        {l.transit ? <TransitChip listing={l} /> : <p className="type-body-sm">{t('housing.noLocation')}</p>}
        {l.campusDistanceKm !== null && <p className="type-body-sm">{t('housing.campus', { km: l.campusDistanceKm })}</p>}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 type-heading-3">
          <ShieldWarning size={20} weight="bold" aria-hidden />
          {t('housing.beforePay')}
        </h2>
        <ul className="flex flex-col gap-2 type-body-sm">
          <li>{t('housing.beforePay1')}</li>
          <li>
            <a href="https://dubailand.gov.ae/en/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
              {t('housing.beforePay2')}
              <ArrowSquareOut size={14} weight="bold" aria-label="opens in a new tab" />
            </a>
          </li>
          <li>
            <button type="button" onClick={() => setReportOpen(true)} className="min-h-11 text-start underline underline-offset-2">
              {t('housing.beforePay3')}
            </button>
          </li>
        </ul>
      </Card>

      <p className="rounded-3xl bg-cornflower-wash p-4 type-body-sm">{t('housing.ejari')}</p>

      {l.source && (
        <p className="type-caption text-ink-muted">
          {t('housing.listedBy')}:{' '}
          <a href={l.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {l.source.label}
          </a>{' '}
          · {t('common.checkedOn', { date: l.source.checkedOn })}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Button
          block
          loading={viewing.isPending}
          loadingLabel="Sending"
          onClick={() =>
            viewing.mutate(
              {},
              {
                onSuccess: (r) => toast(r.alreadyRequested ? t('housing.viewingAgain', { provider: r.providerName }) : t('housing.viewingSent', { provider: r.providerName })),
                onError: (e) => toast.error(errorMessage(e)),
              },
            )
          }
        >
          {t('housing.requestViewing')}
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" size="md" className="flex-1" aria-pressed={saved} onClick={() => save.mutate(l.id, { onError: (e) => toast.error(errorMessage(e)) })}>
            <BookmarkSimple size={20} weight={saved ? 'fill' : 'bold'} aria-hidden />
            {saved ? t('common.saved') : t('common.save')}
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            disabled={!verified}
            aria-pressed={chosen}
            onClick={() =>
              choose.mutate(
                { chosenListingId: chosen ? null : l.id },
                { onSuccess: () => !chosen && navigate('/app/budget'), onError: (e) => toast.error(errorMessage(e)) },
              )
            }
          >
            {chosen ? t('housing.inBudget') : t('housing.useInBudget')}
          </Button>
        </div>
        <Button variant="ghost" onClick={() => setReportOpen(true)} className="self-center">
          {t('housing.report')}
        </Button>
      </div>
      <ReportSheet open={reportOpen} onOpenChange={setReportOpen} listingId={l.id} />
    </article>
  );
}
