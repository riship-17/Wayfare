import { CheckCircle } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { EID_STATUSES, EID_STATUS_LABELS, eidIndex, type EidStatus } from '@wayfare/shared';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useEidStatus } from '@/lib/queries';
import { useUi } from '@/lib/store';

/** The steps from PROMPT.md 9.2. The student enters them; we never claim live government tracking. */
export function EidSheet({ open, onOpenChange, current }: { open: boolean; onOpenChange: (o: boolean) => void; current: EidStatus }) {
  const { t } = useTranslation();
  const [value, setValue] = useState<EidStatus>(current);
  const update = useEidStatus();
  const setJustUnlocked = useUi((s) => s.setJustUnlocked);

  const save = () =>
    update.mutate(value, {
      onSuccess: ({ unlocked }) => {
        onOpenChange(false);
        setJustUnlocked(unlocked);
        if (value === 'card_received' && unlocked.length) toast(t('eid.unlockToast', { count: unlocked.length }));
        else toast(t('eid.statusSaved', { status: EID_STATUS_LABELS[value] }));
        window.setTimeout(() => setJustUnlocked([]), 2500);
      },
      onError: (e) => toast.error(errorMessage(e)),
    });

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (o) setValue(current);
        onOpenChange(o);
      }}
      title={t('eid.title')}
      description={t('eid.sub')}
      footer={
        <Button block onClick={save} loading={update.isPending} loadingLabel="Saving" disabled={value === current}>
          {t('eid.update')}
        </Button>
      }
    >
      <fieldset className="flex flex-col gap-1">
        <legend className="sr-only">{t('eid.title')}</legend>
        <ol className="flex flex-col">
          {EID_STATUSES.map((s, i) => {
            const reached = eidIndex(s) <= eidIndex(value);
            return (
              <li key={s} className="relative flex">
                {i < EID_STATUSES.length - 1 && <span aria-hidden className={cn('absolute start-5 top-10 h-full w-0.5', eidIndex(s) < eidIndex(value) ? 'bg-ink' : 'bg-hairline')} />}
                <label className="tap flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-2xl py-1 pe-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink">
                  <input type="radio" name="eid-status" className="sr-only" checked={value === s} onChange={() => setValue(s)} />
                  <span className={cn('relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-[2.5px] border-ink', reached ? 'bg-sage' : 'bg-white')}>
                    {reached ? <CheckCircle size={20} weight="bold" aria-hidden /> : <span className="type-caption-strong">{i + 1}</span>}
                  </span>
                  <span className={cn('type-title', value === s && 'underline decoration-cornflower decoration-[3px] underline-offset-4')}>{EID_STATUS_LABELS[s]}</span>
                </label>
              </li>
            );
          })}
        </ol>
      </fieldset>
      <p className="mt-4 type-body-sm text-ink-muted">{t('home.eidEstimate')}</p>
      <a href="https://icp.gov.ae/en/" target="_blank" rel="noreferrer" className="tap mt-2 inline-flex min-h-11 items-center type-button-sm underline decoration-2 underline-offset-4">
        {t('eid.track')}
      </a>
    </Sheet>
  );
}
