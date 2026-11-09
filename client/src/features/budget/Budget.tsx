import { ArrowSquareOut, Copy, PencilSimple, ShareNetwork } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { COST_TIMINGS, SUPPORTED_CURRENCIES, convertFromAed, formatAed, formatMoney, type ApiCostItem, type ApiListing } from '@wayfare/shared';
import { NeedsChip } from '@/components/brand/Badges';
import { minPrice } from '@/components/housing/ListingParts';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Field';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Sheet } from '@/components/ui/Sheet';
import { LoadingList } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { errorMessage } from '@/lib/api';
import { savedOn } from '@/lib/dates';
import { useBudget, useCosts, useListing, useMe, useRates, useSaveBudget, useShareBudget, useUpdateMe } from '@/lib/queries';

/** Shown as a sourced fact, but not added to totals: it is a price per trip, not a monthly amount. */
export const REFERENCE_ONLY = new Set(['metro-trip']);

export function amountFor(c: ApiCostItem, entered: Map<string, number | null>, listing: ApiListing | null): number | null {
  const own = entered.get(c.key);
  if (own !== undefined && own !== null) return own;
  if (c.fromListing && listing && listing.verification.status === 'verified') {
    if (c.fromListing === 'rent') return minPrice(listing);
    const deposits = listing.roomTypes.map((r) => r.depositAed).filter((d): d is number => d !== null);
    return deposits.length ? Math.min(...deposits) : null;
  }
  return c.amountAed;
}

export function totals(costs: ApiCostItem[], entered: Map<string, number | null>, listing: ApiListing | null) {
  let first = 0;
  let monthly = 0;
  for (const c of costs) {
    if (REFERENCE_ONLY.has(c.key) && entered.get(c.key) == null) continue;
    const a = amountFor(c, entered, listing) ?? 0;
    first += a;
    if (c.timing === 'monthly') monthly += a;
  }
  return { first, monthly };
}

function ShareSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const budget = useBudget();
  const share = useShareBudget();
  const token = budget.data?.shareToken;
  const url = token ? `${window.location.origin}/share/${token}` : null;
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast(t('budget.shareCopied'));
    } catch {
      toast.error('Copy did not work. Press and hold the link to copy it.');
    }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('budget.shareTitle')} description={t('budget.shareSub')}>
      {url ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-2xl bg-sage p-4 type-body-sm" role="status">{t('budget.shareReady')}</p>
          <a href={url} target="_blank" rel="noreferrer" className="break-all rounded-2xl bg-white p-4 type-body-sm underline underline-offset-2 card-outline" data-testid="share-url">
            {url}
          </a>
          <Button block onClick={copy}>
            <Copy size={20} weight="bold" aria-hidden />
            {t('budget.shareCopy')}
          </Button>
          <Button variant="danger" block loading={share.isPending} loadingLabel="Turning off" onClick={() => share.mutate(false, { onSuccess: () => toast(t('budget.shareOffDone')), onError: (e) => toast.error(errorMessage(e)) })}>
            {t('budget.shareOff')}
          </Button>
        </div>
      ) : (
        <Button block loading={share.isPending} loadingLabel="Creating link" onClick={() => share.mutate(true, { onError: (e) => toast.error(errorMessage(e)) })}>
          {t('budget.shareCreate')}
        </Button>
      )}
    </Sheet>
  );
}

export function Budget() {
  const { t } = useTranslation();
  const me = useMe();
  const costs = useCosts();
  const budget = useBudget();
  const rates = useRates();
  const save = useSaveBudget();
  const updateMe = useUpdateMe();
  const user = me.data?.user;
  const chosen = useListing(user?.chosenListingId ?? '', undefined);
  const listing = user?.chosenListingId ? (chosen.data?.listing ?? null) : null;
  const [editing, setEditing] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const currency = user?.homeCurrency ?? 'AED';
  const r = rates.data?.rates;

  if (costs.isPending || budget.isPending) return <div className="flex flex-col gap-6 px-4"><ScreenHeader back="/app" title={t('budget.title')} /><LoadingList count={3} /></div>;
  if (costs.isError || budget.isError) return <div className="flex flex-col gap-6 px-4"><ScreenHeader back="/app" title={t('budget.title')} /><ErrorState error={costs.error ?? budget.error} onRetry={() => { void costs.refetch(); void budget.refetch(); }} /></div>;

  const entered = new Map(budget.data.items.map((i) => [i.key, i.amountAed]));
  const sum = totals(costs.data, entered, listing);
  const home = (aed: number) => convertFromAed(aed, currency, r);

  const submit = (key: string) => (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const raw = String(new FormData(e.currentTarget).get('amount') ?? '').trim();
    const value = raw === '' ? null : Number(raw);
    if (value !== null && (!Number.isFinite(value) || value < 0)) return toast.error('Enter an amount in AED, like 650.');
    const items = [...entered.entries()].filter(([k]) => k !== key).map(([k, v]) => ({ key: k, amountAed: v }));
    items.push({ key, amountAed: value });
    save.mutate(items, { onSuccess: () => { setEditing(null); toast(t('budget.savedToast')); }, onError: (err) => toast.error(errorMessage(err)) });
  };

  return (
    <div className="flex flex-col gap-6 px-4">
      <ScreenHeader back="/app" title={t('budget.title')} sub={t('budget.sub', { currency })} />

      <Card tone="ink" className="flex flex-col gap-4" aria-live="polite">
        <div className="flex flex-col gap-1">
          <p className="type-overline text-white">{t('budget.firstMonthTotal')}</p>
          {home(sum.first) !== null && currency !== 'AED' ? (
            <AnimatedNumber value={home(sum.first)!} format={(n) => formatMoney(n, currency)} className="type-display text-white" />
          ) : (
            <p className="type-display text-white">{formatAed(sum.first)}</p>
          )}
          {currency !== 'AED' && <p className="type-body-sm text-white">{formatAed(Math.round(sum.first))}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <p className="type-overline text-white">{t('budget.monthlyTotal')}</p>
          {home(sum.monthly) !== null && currency !== 'AED' ? (
            <AnimatedNumber value={home(sum.monthly)!} format={(n) => formatMoney(n, currency)} className="type-heading-2 text-white" />
          ) : (
            <p className="type-heading-2 text-white">{formatAed(sum.monthly)}</p>
          )}
        </div>
        <Button block onClick={() => setShareOpen(true)} data-testid="share-family">
          <ShareNetwork size={20} weight="bold" aria-hidden />
          {t('budget.share')}
        </Button>
      </Card>

      <div className="flex flex-col gap-2">
        <Select label="Show amounts in" value={currency} onChange={(e) => updateMe.mutate({ homeCurrency: e.target.value }, { onError: (err) => toast.error(errorMessage(err)) })}>
          {['AED', ...SUPPORTED_CURRENCIES].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        {rates.data ? (
          <p className="type-caption text-ink-muted">
            {t('budget.rates', { date: savedOn(rates.data.fetchedAt) })}{' '}
            <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {t('budget.ratesProvider')}
            </a>
          </p>
        ) : rates.isError ? (
          <p className="type-caption text-ink-muted">{t('budget.ratesMissing')}</p>
        ) : null}
      </div>

      <p className="rounded-3xl bg-cornflower-wash p-4 type-body-sm">{t('budget.rentPrompt')}</p>

      {COST_TIMINGS.map((timing) => {
        const items = costs.data.filter((c) => c.timing === timing);
        if (!items.length) return null;
        return (
          <section key={timing} aria-labelledby={`t-${timing}`} className="flex flex-col gap-3">
            <h2 id={`t-${timing}`} className="type-heading-3">{t(`budget.${timing}`)}</h2>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {items.map((c) => {
                const amount = amountFor(c, entered, listing);
                const homeAmount = amount !== null ? home(amount) : null;
                const fromListing = c.fromListing && entered.get(c.key) == null;
                return (
                  <li key={c.key} className="flex flex-col gap-2 rounded-3xl bg-white p-4 card-outline">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="type-title">{c.label}</p>
                        {c.needsEmiratesId && <NeedsChip requirement="emirates_id" className="self-start" />}
                      </div>
                      <div className="flex shrink-0 flex-col items-end text-end">
                        <p className="type-title tabular-nums">{amount !== null ? formatAed(amount) : t('budget.unknown')}</p>
                        {homeAmount !== null && currency !== 'AED' && <p className="type-caption text-ink-muted tabular-nums">≈ {formatMoney(homeAmount, currency)}</p>}
                      </div>
                    </div>
                    {fromListing && listing && amount !== null && <p className="type-caption text-ink-muted">{t('budget.fromListing', { title: listing.title })}</p>}
                    {c.fromListing && !listing && entered.get(c.key) == null && (
                      <Link to="/app/housing" className="inline-flex min-h-11 items-center type-body-sm underline underline-offset-2">
                        {t('budget.chooseListing')}
                      </Link>
                    )}
                    {c.amountNote && !c.fromListing && <p className="type-caption text-ink-muted">{c.amountNote}</p>}
                    {c.source && (
                      <a href={c.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 self-start type-caption text-ink-muted underline underline-offset-2">
                        {t('common.source')}: {c.source.label} · {t('common.checkedOn', { date: c.source.checkedOn })}
                        <ArrowSquareOut size={12} weight="bold" aria-label="opens in a new tab" />
                      </a>
                    )}
                    {editing === c.key ? (
                      <form onSubmit={submit(c.key)} className="flex items-end gap-2">
                        <div className="flex-1">
                          <Input name="amount" label={t('budget.amountLabel', { label: c.label })} type="number" inputMode="decimal" min={0} step="any" defaultValue={entered.get(c.key) ?? ''} autoFocus />
                        </div>
                        <Button type="submit" size="md" variant="secondary" loading={save.isPending} loadingLabel="Saving">
                          {t('common.save')}
                        </Button>
                      </form>
                    ) : (
                      <button type="button" onClick={() => setEditing(c.key)} className="tap inline-flex min-h-11 items-center gap-1 self-start type-button-sm underline decoration-2 underline-offset-4">
                        <PencilSimple size={16} weight="bold" aria-hidden />
                        {entered.get(c.key) != null ? t('budget.edit') : t('budget.enter')}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <ShareSheet open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
