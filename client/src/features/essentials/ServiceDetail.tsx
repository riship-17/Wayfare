import { ArrowSquareOut } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { NeedsChip } from '@/components/brand/Badges';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useEssentials } from '@/lib/queries';
import { ServiceTag } from './Essentials';
import { SERVICE_ICONS } from './icons';

export function ServiceDetail() {
  const { key = '' } = useParams();
  const { t } = useTranslation();
  const q = useEssentials();
  const s = q.data?.find((x) => x.key === key);
  if (q.isPending) return <div className="px-4 pt-6"><LoadingList count={2} /></div>;
  if (q.isError) return <div className="px-4 pt-6"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  if (!s) return <div className="flex flex-col gap-6 px-4"><ScreenHeader back="/app/essentials" title={t('notFound.title')} /><EmptyState title={t('notFound.body')} /></div>;
  const I = SERVICE_ICONS[s.icon] ?? SERVICE_ICONS.info;
  return (
    <article className="flex max-w-3xl flex-col gap-6 px-4">
      <ScreenHeader back="/app/essentials" overline={<I size={32} weight="regular" aria-hidden />} title={s.title} />
      <ServiceTag ready={s.dayZeroReady} />
      <p className="type-body">{s.summary}</p>
      {s.needs.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="type-heading-3">{t('essentials.needs')}</h2>
          <div className="flex flex-wrap gap-2">{s.needs.map((n) => <NeedsChip key={n} requirement={n} />)}</div>
        </section>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="type-heading-3">{t('essentials.steps')}</h2>
        <ol className="flex flex-col gap-3">
          {s.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink type-caption-strong text-white" aria-hidden>{i + 1}</span>
              <span className="type-body">{step}</span>
            </li>
          ))}
        </ol>
      </section>
      {s.bridge && (
        <Card tone="arrive">
          <p className="type-label">{t('essentials.bridge')}</p>
          <p className="type-body-sm">{s.bridge}</p>
        </Card>
      )}
      {s.links.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="type-heading-3">{t('essentials.links')}</h2>
          <ul>
            {s.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer" className="tap inline-flex min-h-11 items-center gap-2 type-body-sm underline decoration-2 underline-offset-4">
                  {l.label}
                  <ArrowSquareOut size={16} weight="bold" aria-label="opens in a new tab" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="type-caption text-ink-muted">
        {t('common.source')}:{' '}
        <a href={s.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{s.source.label}</a>
        {' · '}
        {t('common.checkedOn', { date: s.source.checkedOn })}. {t('common.checkOfficial')}
      </p>
    </article>
  );
}
