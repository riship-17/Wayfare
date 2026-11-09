import { ArrowSquareOut, Lock, MapPin, Money } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { toast } from 'sonner';
import { REQUIREMENT_LABELS, STAGE_LABELS, stageForPhase } from '@wayfare/shared';
import { NeedsChip } from '@/components/brand/Badges';
import { StageChip } from '@/components/brand/StageChip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { errorMessage } from '@/lib/api';
import { useJourney, useSetTask } from '@/lib/queries';

export function TaskDetail() {
  const { key = '' } = useParams();
  const { t } = useTranslation();
  const journey = useJourney();
  const setTask = useSetTask();
  const task = journey.data?.tasks.find((x) => x.key === key);

  if (journey.isPending) return <div className="px-4 pt-6"><LoadingList count={3} /></div>;
  if (journey.isError) return <div className="px-4 pt-6"><ErrorState error={journey.error} onRetry={() => journey.refetch()} /></div>;
  if (!task) return <div className="flex flex-col gap-6 px-4"><ScreenHeader back="/app/journey" title={t('notFound.title')} /><EmptyState title={t('notFound.body')} /></div>;

  const done = task.status === 'done';
  const locked = task.availability === 'locked' && !done;
  const toggle = () =>
    setTask.mutate(
      { key: task.key, status: done ? 'todo' : 'done' },
      {
        onSuccess: (r) => toast(r.queued ? t('journey.queuedToast') : done ? t('journey.markNotDone') : t('journey.doneToast')),
        onError: (e) => toast.error(errorMessage(e)),
      },
    );

  return (
    <article className="flex max-w-3xl flex-col gap-6 px-4">
      <ScreenHeader back overline={<StageChip stage={stageForPhase(task.phase)} className="self-start" />} title={task.title} />
      <span className="sr-only">Stage {STAGE_LABELS[stageForPhase(task.phase)]}</span>

      {locked && (
        <Card tone="arrive" className="flex flex-col gap-3">
          <p className="flex items-center gap-2 type-title">
            <Lock size={20} weight="bold" aria-hidden />
            {task.missing.includes('emirates_id') ? t('journey.locked') : t('journey.lockedBecause', { list: task.missing.map((m) => REQUIREMENT_LABELS[m]).join(', ') })}
          </p>
          {task.bridge && (
            <p className="type-body-sm">
              <span className="font-semibold">{t('journey.bridge')}: </span>
              {task.bridge}
            </p>
          )}
        </Card>
      )}

      <section aria-labelledby="why" className="flex flex-col gap-2">
        <h2 id="why" className="type-heading-3">{t('journey.why')}</h2>
        <p className="type-body">{task.summary}</p>
      </section>

      {task.steps.length > 0 && (
        <section aria-labelledby="steps" className="flex flex-col gap-3">
          <h2 id="steps" className="type-heading-3">{t('journey.steps')}</h2>
          <ol className="flex flex-col gap-3">
            {task.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink type-caption-strong text-white" aria-hidden>{i + 1}</span>
                <span className="type-body">{s}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {task.requires.length > 0 && (
        <section aria-labelledby="needs" className="flex flex-col gap-3">
          <h2 id="needs" className="type-heading-3">{t('journey.needs')}</h2>
          <div className="flex flex-wrap gap-2">
            {task.requires.map((r) => (
              <NeedsChip key={r} requirement={r} locked={task.missing.includes(r)} />
            ))}
          </div>
        </section>
      )}

      {(task.where || task.costNote) && (
        <Card className="flex flex-col gap-4">
          {task.where && (
            <div className="flex gap-3">
              <MapPin size={20} weight="bold" aria-hidden className="mt-0.5 shrink-0" />
              <div><p className="type-label">{t('journey.where')}</p><p className="type-body-sm">{task.where}</p></div>
            </div>
          )}
          {task.costNote && (
            <div className="flex gap-3">
              <Money size={20} weight="bold" aria-hidden className="mt-0.5 shrink-0" />
              <div><p className="type-label">{t('journey.cost')}</p><p className="type-body-sm">{task.costNote}</p></div>
            </div>
          )}
        </Card>
      )}

      {task.officialLinks.length > 0 && (
        <section aria-labelledby="links" className="flex flex-col gap-2">
          <h2 id="links" className="type-heading-3">{t('journey.links')}</h2>
          <ul className="flex flex-col">
            {task.officialLinks.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer" className="tap flex min-h-11 items-center gap-2 type-body-sm underline decoration-2 underline-offset-4">
                  {l.label}
                  <ArrowSquareOut size={16} weight="bold" aria-label="opens in a new tab" />
                </a>
              </li>
            ))}
          </ul>
          <p className="type-caption text-ink-muted">{t('common.checkOfficial')}</p>
        </section>
      )}

      <div className="sticky bottom-24 z-10 pt-2 md:bottom-6 md:max-w-sm">
        <Button block onClick={toggle} disabled={locked} loading={setTask.isPending} loadingLabel="Saving" variant={done ? 'secondary' : 'primary'}>
          {done ? t('journey.markNotDone') : t('journey.markDone')}
        </Button>
      </div>
    </article>
  );
}
