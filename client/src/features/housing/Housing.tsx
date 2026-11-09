import { FadersHorizontal, MapPin } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { VerifiedBadge } from '@/components/brand/Badges';
import { FilterSheet } from '@/components/housing/FilterSheet';
import { ListingVisual, PriceLine, TransitChip, roomSummary } from '@/components/housing/ListingParts';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useInstitutions, useListings, useMe, useRates } from '@/lib/queries';
import { useUi } from '@/lib/store';

export function Housing() {
  const { t } = useTranslation();
  const me = useMe();
  const rates = useRates();
  const institutions = useInstitutions();
  const filters = useUi((s) => s.housingFilters);
  const setFilters = useUi((s) => s.setHousingFilters);
  const listings = useListings(filters);
  const [open, setOpen] = useState(false);
  const user = me.data?.user;
  const currency = user?.homeCurrency ?? 'AED';
  const uni = institutions.data?.find((i) => i.id === user?.institutionId);
  const active = Object.entries(filters).filter(([k, v]) => k !== 'sort' && v).length;

  return (
    <div className="flex flex-col gap-6 px-4">
      <ScreenHeader
        title={t('housing.title')}
        sub={uni ? t('housing.sub', { university: uni.name }) : undefined}
        action={
          <button type="button" onClick={() => setOpen(true)} className="tap relative mt-1 inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white px-4 type-button-sm card-outline hover:bg-cornflower-wash">
            <FadersHorizontal size={20} weight="bold" aria-hidden />
            {t('housing.filters')}
            {active > 0 && <span className="rounded-full bg-ink px-2 type-caption-strong text-white">{active}</span>}
          </button>
        }
      />

      {listings.isPending ? (
        <LoadingList count={3} media label="Loading places" />
      ) : listings.isError ? (
        <ErrorState error={listings.error} message={t('housing.loadError')} onRetry={() => listings.refetch()} />
      ) : listings.data.listings.length === 0 ? (
        <EmptyState
          title={t('housing.empty')}
          body={t('housing.emptyHint')}
          action={
            <Button variant="secondary" size="sm" onClick={() => setFilters({})}>
              {t('housing.clear')}
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listings.data.listings.map((l) => (
            <li key={l.id}>
              <Link to={`/app/housing/${l.id}`} className="tap flex flex-col gap-4 rounded-3xl bg-white p-4 card-outline hover:bg-cornflower-wash" data-testid="listing-card">
                <ListingVisual listing={l} zoom="exit" className="h-36" />
                <div className="flex flex-col gap-2 px-2 pb-2">
                  <VerifiedBadge verified={l.verification.status === 'verified'} institution={l.verification.verifiedByName} className="self-start" />
                  <h2 className="type-heading-3">{l.title}</h2>
                  <p className="inline-flex items-center gap-1 type-body-sm text-ink-muted">
                    <MapPin size={16} weight="bold" aria-hidden />
                    {l.providerName} · {l.area}
                  </p>
                  <p className="type-caption text-ink-muted">{roomSummary(l)}</p>
                  <PriceLine listing={l} currency={currency} rates={rates.data?.rates} />
                  <TransitChip listing={l} />
                  {l.campusDistanceKm !== null && <p className="type-body-sm">{t('housing.campus', { km: l.campusDistanceKm })}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <FilterSheet open={open} onOpenChange={setOpen} value={filters} onApply={setFilters} currency={currency} rates={rates.data?.rates} />
    </div>
  );
}
