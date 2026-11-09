import * as Tabs from '@radix-ui/react-tabs';
import { IdentificationCard } from '@phosphor-icons/react';
import { LayoutGroup } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { EID_STATUS_LABELS, STAGES, phasesForStage, type JourneyTask, type Stage } from '@wayfare/shared';
import { JourneyBattery } from '@/components/brand/JourneyBattery';
import { STAGE_BG } from '@/components/brand/StageChip';
import { EidSheet } from '@/components/journey/EidSheet';
import { TaskRow } from '@/components/journey/TaskRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useJourney, useSetTask } from '@/lib/queries';
import { useUi } from '@/lib/store';

function Group({ title, tasks, onToggle, justUnlocked, id }: { title: string; tasks: JourneyTask[]; onToggle: (t: JourneyTask) => void; justUnlocked: string[]; id: string }) {
  if (!tasks.length) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="type-overline text-ink-muted">
        {title} <span className="tabular-nums">· {tasks.length}</span>
      </h2>
      <ul className="flex flex-col gap-3">
        {tasks.map((t) => (
          <TaskRow key={t.key} task={t} onToggle={onToggle} justUnlocked={justUnlocked.includes(t.key)} />
        ))}
      </ul>
    </section>
  );
}

export function Journey() {
  const { t } = useTranslation();
  const journey = useJourney();
  const setTask = useSetTask();
  const justUnlocked = useUi((s) => s.justUnlocked);
  const [tab, setTab] = useState<Stage | null>(null);
  const [eidOpen, setEidOpen] = useState(false);
  const j = journey.data;
  const stage = tab ?? j?.stage ?? 'prepare';

  const toggle = (task: JourneyTask) => {
    const status = task.status === 'done' ? 'todo' : 'done';
    setTask.mutate(
      { key: task.key, status },
      {
        onSuccess: (r) => {
          if (r.queued) toast(t('journey.queuedToast'));
          else if (status === 'done') toast(t('journey.doneToast'));
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6 px-4">
      <ScreenHeader title={t('journey.title')} sub={j ? j.countdown : undefined} />
      {journey.isPending ? (
        <LoadingList count={4} />
      ) : journey.isError || !j ? (
        <ErrorState error={journey.error} onRetry={() => journey.refetch()} />
      ) : (
        <>
          <JourneyBattery battery={j.battery} size="sm" />
          <button type="button" onClick={() => setEidOpen(true)} className="tap flex min-h-12 items-center gap-3 rounded-full bg-white px-4 card-outline hover:bg-cornflower-wash">
            <IdentificationCard size={20} weight="bold" aria-hidden />
            <span className="flex-1 text-start type-label">{t('home.eidTitle')}: {EID_STATUS_LABELS[j.eidStatus]}</span>
            <span className="type-button-sm underline underline-offset-4">{t('common.edit', 'Update')}</span>
          </button>
          <Tabs.Root value={stage} onValueChange={(v) => setTab(v as Stage)} className="flex flex-col gap-6">
            <Tabs.List aria-label={t('journey.title')} className="flex gap-2">
              {STAGES.map((s) => (
                <Tabs.Trigger
                  key={s}
                  value={s}
                  className={cn('tap flex min-h-11 flex-1 items-center justify-center rounded-full border-[2.5px] type-button-sm', s === stage ? cn(STAGE_BG[s], 'border-ink') : 'border-transparent bg-white hover:border-ink')}
                >
                  {t(`stage.${s}`)}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            {STAGES.map((s) => {
              const phases = phasesForStage(s);
              const tasks = j.tasks.filter((x) => phases.includes(x.phase));
              const doNow = tasks.filter((x) => x.status === 'todo' && x.availability === 'available');
              const lockedEid = tasks.filter((x) => x.status === 'todo' && x.availability === 'locked' && x.missing.some((m) => m === 'emirates_id' || m === 'residence_issued' || m === 'ejari'));
              const lockedOther = tasks.filter((x) => x.status === 'todo' && x.availability === 'locked' && !lockedEid.includes(x));
              const done = tasks.filter((x) => x.status !== 'todo');
              return (
                <Tabs.Content key={s} value={s} className="flex flex-col gap-6 outline-none">
                  {tasks.length === 0 ? (
                    <EmptyState title={t('journey.emptyStage')} />
                  ) : (
                    <LayoutGroup id={`journey-${s}`}>
                      <Group id={`now-${s}`} title={t('journey.doNow')} tasks={doNow} onToggle={toggle} justUnlocked={justUnlocked} />
                      <Group id={`eid-${s}`} title={t('journey.locked')} tasks={lockedEid} onToggle={toggle} justUnlocked={justUnlocked} />
                      <Group id={`later-${s}`} title={t('journey.lockedOther')} tasks={lockedOther} onToggle={toggle} justUnlocked={justUnlocked} />
                      <Group id={`done-${s}`} title={t('journey.done')} tasks={done} onToggle={toggle} justUnlocked={justUnlocked} />
                    </LayoutGroup>
                  )}
                </Tabs.Content>
              );
            })}
          </Tabs.Root>
          <EidSheet open={eidOpen} onOpenChange={setEidOpen} current={j.eidStatus} />
        </>
      )}
    </div>
  );
}
