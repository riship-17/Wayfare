import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ROOM_TYPES, ROOM_TYPE_LABELS, formatMoney } from '@wayfare/shared';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { SwitchRow } from '@/components/ui/Switch';
import type { ListingFilters } from '@/lib/queries';

/** Budget is chosen in the home currency and sent to the server in AED. */
export function FilterSheet({ open, onOpenChange, value, onApply, currency, rates }: { open: boolean; onOpenChange: (o: boolean) => void; value: ListingFilters; onApply: (f: ListingFilters) => void; currency: string; rates?: Record<string, number> | null }) {
  const { t } = useTranslation();
  const [f, setF] = useState<ListingFilters>(value);
  const rate = currency === 'AED' ? 1 : rates?.[currency];
  const stepsAed = [2000, 3000, 4000, 5000, 6500];
  const budgetOptions = [
    { value: '', label: t('filters.anyBudget') },
    ...stepsAed.map((aed) => ({ value: String(aed), label: rate ? `${formatMoney(Math.round((aed * rate) / 100) * 100, currency)}` : `AED ${aed.toLocaleString('en-GB')}` })),
  ];
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (o) setF(value);
        onOpenChange(o);
      }}
      title={t('filters.title')}
      footer={
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setF({ sort: f.sort })}>
            {t('filters.reset')}
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onApply(f);
              onOpenChange(false);
            }}
          >
            {t('filters.apply')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <Segmented label={`${t('filters.budget')}${currency !== 'AED' ? ` (${currency})` : ''}`} value={f.maxPriceAed ? String(f.maxPriceAed) : ''} options={budgetOptions} onChange={(v) => setF({ ...f, maxPriceAed: v ? Number(v) : undefined })} />
        <Segmented
          label={t('filters.roomType')}
          value={f.roomType ?? ''}
          options={[{ value: '', label: t('filters.any') }, ...ROOM_TYPES.map((r) => ({ value: r, label: ROOM_TYPE_LABELS[r] }))]}
          onChange={(v) => setF({ ...f, roomType: v || undefined })}
        />
        <SwitchRow label={t('filters.nearTransit')} hint={t('filters.nearTransitHint')} checked={!!f.nearTransit} onChange={(v) => setF({ ...f, nearTransit: v || undefined })} />
        <SwitchRow label={t('filters.womenOnly')} checked={!!f.womenOnly} onChange={(v) => setF({ ...f, womenOnly: v || undefined })} />
        <SwitchRow label={t('filters.bills')} checked={!!f.billsIncluded} onChange={(v) => setF({ ...f, billsIncluded: v || undefined })} />
      </div>
    </Sheet>
  );
}
