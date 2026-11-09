import { useQuery } from '@tanstack/react-query';
import { CheckCircle } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { COST_TIMINGS, convertFromAed, formatAed, formatMoney, shortDate, type ApiShareView } from '@wayfare/shared';
import { VerifiedBadge } from '@/components/brand/Badges';
import { Skyline } from '@/components/brand/Illustrations';
import { WayfareLogo } from '@/components/brand/WayfarePin';
import { ListingVisual, PriceLine, TransitChip } from '@/components/housing/ListingParts';
import { Card } from '@/components/ui/Card';
import { LoadingList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/States';
import { get, RequestError } from '@/lib/api';
import { savedOn } from '@/lib/dates';
import { REFERENCE_ONLY, amountFor, totals } from '../budget/Budget';

export function FamilyView() {
  const { token = '' } = useParams();
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['share', token], queryFn: async () => (await get<{ share: ApiShareView }>(`/share/${token}`)).share, retry: false });

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const s = q.data;
  const currency = s?.homeCurrency ?? 'AED';
  const entered = new Map((s?.items ?? []).map((i) => [i.key, i.amountAed]));
  const sum = s ? totals(s.costs, entered, s.listing) : { first: 0, monthly: 0 };
  const inHome = (aed: number) => {
    const v = convertFromAed(aed, currency, s?.rates?.rates);
    return v === null ? formatAed(aed) : formatMoney(v, currency);
  };

  return (
    <div className="min-h-dvh bg-paper">
      <main id="main" className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-4 pt-8 pb-12">
        <WayfareLogo size="sm" />
        {q.isPending ? (
          <LoadingList count={3} />
        ) : q.isError || !s ? (
          <EmptyState title={q.error instanceof RequestError ? q.error.message : t('share.gone')} />
        ) : (
          <>
            <header className="flex flex-col gap-2">
              <h1 className="type-display">{t('share.title', { name: s.studentFirstName })}</h1>
              <p className="type-body-sm text-ink-muted">{t('share.sub', { name: s.studentFirstName })}</p>
              <p className="type-body-sm">
                {[s.institutionName, s.arrivalDate ? t('share.arrives', { date: shortDate(s.arrivalDate, true) }) : null].filter(Boolean).join(' · ')}
              </p>
            </header>

            <Card tone="ink" className="flex flex-col gap-2">
              <p className="type-overline text-white">{t('budget.firstMonthTotal')}</p>
              <p className="type-display text-white">{inHome(sum.first)}</p>
              <p className="type-body-sm text-white">{formatAed(Math.round(sum.first))} · {t('budget.monthlyTotal')}: {inHome(sum.monthly)}</p>
              {s.rates && (
                <p className="type-caption text-white">
                  {t('budget.rates', { date: savedOn(s.rates.fetchedAt) })} <a className="underline" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">{t('budget.ratesProvider')}</a>
                </p>
              )}
            </Card>

            <section aria-labelledby="b" className="flex flex-col gap-3">
              <h2 id="b" className="type-heading-3">{t('share.budget')}</h2>
              {COST_TIMINGS.map((timing) => (
                <div key={timing} className="flex flex-col gap-2">
                  <p className="type-overline text-ink-muted">{t(`budget.${timing}`)}</p>
                  <ul className="flex flex-col divide-y-2 divide-hairline rounded-3xl bg-white px-4 card-outline">
                    {s.costs
                      .filter((c) => c.timing === timing)
                      .map((c) => {
                        const a = amountFor(c, entered, s.listing);
                        return (
                          <li key={c.key} className="flex items-start justify-between gap-4 py-3">
                            <span className="type-body-sm">{c.label}{REFERENCE_ONLY.has(c.key) ? ' (a trip)' : ''}</span>
                            <span className="flex flex-col items-end text-end">
                              <span className="type-label tabular-nums">{a !== null ? inHome(a) : t('budget.unknown')}</span>
                              {a !== null && currency !== 'AED' && <span className="type-caption text-ink-muted">{formatAed(a)}</span>}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              ))}
            </section>

            <section aria-labelledby="p" className="flex flex-col gap-3">
              <h2 id="p" className="type-heading-3">{t('share.place')}</h2>
              {s.listing ? (
                <Card className="flex flex-col gap-3">
                  <ListingVisual listing={s.listing} className="h-32" />
                  <VerifiedBadge verified={s.listing.verification.status === 'verified'} institution={s.listing.verification.verifiedByName} className="self-start" />
                  <p className="type-title">{s.listing.title}</p>
                  <PriceLine listing={s.listing} currency={currency} rates={s.rates?.rates} />
                  <TransitChip listing={s.listing} />
                </Card>
              ) : (
                <EmptyState title={t('share.noPlace')} art="none" />
              )}
            </section>

            <section aria-labelledby="d" className="flex flex-col gap-3">
              <h2 id="d" className="type-heading-3">{t('share.dayZero')}</h2>
              <ol className="flex flex-col gap-2 rounded-3xl bg-lilac p-6">
                {s.dayZero.map((d) => (
                  <li key={d.key} className="flex items-start gap-2 type-body-sm">
                    <CheckCircle size={20} weight="bold" aria-hidden className="shrink-0" />
                    {d.title}
                  </li>
                ))}
              </ol>
            </section>
            <p className="type-caption text-ink-muted">{t('about.notGov')}</p>
          </>
        )}
      </main>
      <Skyline className="h-16" />
    </div>
  );
}
