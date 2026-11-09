import { CheckCircle, CloudCheck, Lock, ShieldCheck, WifiSlash } from '@phosphor-icons/react';
import { REQUIREMENT_LABELS, type Requirement } from '@wayfare/shared';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export function VerifiedBadge({ institution, verified, className }: { institution?: string | null; verified: boolean; className?: string }) {
  const { t } = useTranslation();
  if (!verified) {
    return (
      <span className={cn('inline-flex min-h-7 items-center gap-1 rounded-full border-2 border-ink bg-white px-3 type-caption-strong', className)}>
        {t('housing.notVerified', 'Not verified yet')}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex min-h-7 items-center gap-1 rounded-full bg-sage px-3 type-caption-strong text-ink', className)}>
      <ShieldCheck size={16} weight="bold" aria-hidden />
      Verified by {institution ?? 'your university'}
    </span>
  );
}

/** Documents a task or service needs. Emirates ID shows a lock while the card is not received. */
export function NeedsChip({ requirement, locked, className }: { requirement: Requirement; locked?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex min-h-7 items-center gap-1 rounded-full border-2 border-ink bg-white px-3 type-caption-strong', className)}>
      {locked ? <Lock size={14} weight="bold" aria-label="Locked" /> : null}
      {REQUIREMENT_LABELS[requirement]}
    </span>
  );
}

export function OfflineChip({ online, savedOn, className }: { online: boolean; savedOn?: string | null; className?: string }) {
  const { t } = useTranslation();
  if (online) {
    return (
      <span className={cn('inline-flex min-h-7 items-center gap-1 rounded-full bg-sage px-3 type-caption-strong', className)} role="status">
        <CloudCheck size={16} weight="bold" aria-hidden />
        {t('offline.saved')}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex min-h-7 items-center gap-1 rounded-full bg-ink px-3 type-caption-strong text-white', className)} role="status">
      <WifiSlash size={16} weight="bold" aria-hidden />
      {savedOn ? t('offline.showingSaved', { date: savedOn }) : t('offline.chip')}
    </span>
  );
}

export function DoneMark({ className }: { className?: string }) {
  return <CheckCircle size={20} weight="bold" className={className} aria-hidden />;
}
