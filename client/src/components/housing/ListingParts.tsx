import { Buildings, PersonSimpleWalk, Train } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { ROOM_TYPE_LABELS, type ApiListing } from '@wayfare/shared';
import { approxHome, formatAed } from '@/lib/currency';
import { cn } from '@/lib/cn';

export function minPrice(l: ApiListing): number | null {
  const prices = l.roomTypes.map((r) => r.priceAedMonthly).filter((p): p is number => p !== null);
  return prices.length ? Math.min(...prices) : null;
}

/** Branded placeholder until the provider supplies photos. Never a stock photo pretending to be the property. */
export function ListingVisual({ listing, className, zoom }: { listing: ApiListing; className?: string; zoom?: 'exit' | 'enter' }) {
  const { t } = useTranslation();
  const photo = listing.photos[0];
  const zoomAttr = zoom === 'exit' ? { 'data-zoom-exit-key': listing.id } : zoom === 'enter' ? { 'data-zoom-enter-key': listing.id } : {};
  if (photo) {
    return (
      <figure className={cn('overflow-hidden rounded-2xl', className)}>
        <img src={photo.url} alt={photo.alt} className="size-full object-cover" {...zoomAttr} />
        <figcaption className="sr-only">{photo.credit}</figcaption>
      </figure>
    );
  }
  return (
    <div className={cn('flex flex-col justify-between overflow-hidden rounded-2xl bg-lilac p-4', className)} {...zoomAttr} role="img" aria-label={`${listing.providerName}. ${t('housing.placeholder')}`}>
      <Buildings size={32} weight="regular" aria-hidden />
      <div aria-hidden>
        <p className="type-title">{listing.providerName}</p>
        <p className="type-caption">{t('housing.placeholder')}</p>
      </div>
    </div>
  );
}

export function PriceLine({ listing, currency, rates, large }: { listing: ApiListing; currency: string; rates?: Record<string, number> | null; large?: boolean }) {
  const { t } = useTranslation();
  const verified = listing.verification.status === 'verified';
  const price = minPrice(listing);
  if (!verified || price === null) return <p className={cn(large ? 'type-heading-2' : 'type-title')}>{t('common.askForPrice')}</p>;
  const home = approxHome(price, currency, rates);
  return (
    <div className="flex flex-col">
      <p className={cn(large ? 'type-heading-2' : 'type-title')}>
        {listing.roomTypes.filter((r) => r.priceAedMonthly !== null).length > 1 && <span className="type-body-sm">{t('housing.from')} </span>}
        {t('housing.perMonth', { price: price.toLocaleString('en-GB') })}
      </p>
      {home && <p className="type-body-sm text-ink-muted">{home} a month</p>}
    </div>
  );
}

export function TransitChip({ listing }: { listing: ApiListing }) {
  const { t } = useTranslation();
  if (!listing.transit) return null;
  const I = listing.transit.walkMinutesApprox <= 15 ? PersonSimpleWalk : Train;
  return (
    <p className="inline-flex items-start gap-2 type-body-sm">
      <I size={20} weight="bold" aria-hidden className="shrink-0" />
      <span>{t('housing.walk', { min: listing.transit.walkMinutesApprox, station: listing.transit.stationName, line: listing.transit.lineName })}</span>
    </p>
  );
}

export function roomSummary(l: ApiListing) {
  return l.roomTypes.map((r) => ROOM_TYPE_LABELS[r.type]).join(' · ');
}

export { formatAed };
