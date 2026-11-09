import { CaretRight, CheckCircle, Lock } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { ApiServiceGuide } from '@wayfare/shared';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import { useEssentials } from '@/lib/queries';
import { SERVICE_ICONS } from './icons';

export function ServiceTag({ ready }: { ready: boolean }) {
  const { t } = useTranslation();
  return (
    <span className={cn('inline-flex min-h-7 items-center gap-1 self-start rounded-full px-3 type-caption-strong', ready ? 'bg-sage' : 'bg-lilac')}>
      {ready ? <CheckCircle size={14} weight="bold" aria-hidden /> : <Lock size={14} weight="bold" aria-hidden />}
      {ready ? t('essentials.dayZero') : t('essentials.afterEid')}
    </span>
  );
}

function ServiceCard({ s }: { s: ApiServiceGuide }) {
  const I = SERVICE_ICONS[s.icon] ?? SERVICE_ICONS.info;
  return (
    <li>
      <Link to={`/app/essentials/${s.key}`} className="tap flex items-start gap-4 rounded-3xl bg-white p-4 card-outline hover:bg-cornflower-wash">
        <I size={32} weight="regular" aria-hidden className="shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="type-title">{s.title}</span>
          <ServiceTag ready={s.dayZeroReady} />
          <span className="type-body-sm text-ink-muted">{s.summary}</span>
        </span>
        <CaretRight size={20} weight="bold" aria-hidden className="mt-1 shrink-0" />
      </Link>
    </li>
  );
}

export function Essentials() {
  const { t } = useTranslation();
  const q = useEssentials();
  return (
    <div className="flex flex-col gap-6 px-4">
      <ScreenHeader back="/app" title={t('essentials.title')} sub={t('essentials.sub')} />
      {q.isPending ? (
        <LoadingList count={4} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState title={t('common.offlineNotSaved')} />
      ) : (
        <>
          <section aria-labelledby="ready" className="flex flex-col gap-3">
            <h2 id="ready" className="type-heading-3">{t('essentials.dayZero')}</h2>
            <p className="type-body-sm text-ink-muted">{t('essentials.worksWith')}</p>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{q.data.filter((s) => s.dayZeroReady).map((s) => <ServiceCard key={s.key} s={s} />)}</ul>
          </section>
          <section aria-labelledby="after" className="flex flex-col gap-3">
            <h2 id="after" className="type-heading-3">{t('essentials.afterEid')}</h2>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{q.data.filter((s) => !s.dayZeroReady).map((s) => <ServiceCard key={s.key} s={s} />)}</ul>
          </section>
        </>
      )}
    </div>
  );
}
