import { CaretRight, Lock } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { JourneyTask } from '@wayfare/shared';
import { NeedsChip } from '@/components/brand/Badges';
import { cn } from '@/lib/cn';
import { EASE } from '@/lib/motion';

/** Signature moment: the check path draws, then the row moves to Done with a layout animation. */
export function CheckButton({ done, disabled, onToggle, label }: { done: boolean; disabled?: boolean; onToggle: () => void; label: string }) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn('tap flex size-11 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed')}
    >
      <span className={cn('flex size-7 items-center justify-center rounded-full border-[2.5px] border-ink transition-colors duration-300', done ? 'bg-sage' : 'bg-white', disabled && 'border-hairline')}>
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.4, ease: EASE }}
          />
        </svg>
      </span>
    </button>
  );
}

export function TaskRow({ task, onToggle, justUnlocked }: { task: JourneyTask; onToggle: (t: JourneyTask) => void; justUnlocked?: boolean }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const locked = task.availability === 'locked' && task.status !== 'done';
  const done = task.status === 'done';
  return (
    <motion.li
      layout={!reduce}
      layoutId={reduce ? undefined : `task-${task.key}`}
      transition={{ layout: { duration: 0.5, ease: EASE } }}
      className={cn('flex items-center gap-2 rounded-3xl bg-white py-2 ps-2 pe-4 card-outline', locked && 'border-dashed')}
    >
      {locked ? (
        <motion.span
          className="flex size-11 shrink-0 items-center justify-center"
          aria-hidden
          animate={justUnlocked && !reduce ? { rotate: [0, -14, 12, -8, 0], opacity: [1, 1, 1, 1, 0] } : undefined}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <Lock size={20} weight="bold" />
        </motion.span>
      ) : (
        <CheckButton done={done} onToggle={() => onToggle(task)} label={`${task.title}. ${done ? t('journey.markNotDone') : t('journey.markDone')}`} />
      )}
      <Link to={`/app/journey/${task.key}`} className="tap flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-2xl py-1">
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn('type-title', done && 'text-ink-muted line-through decoration-2')}>{task.title}</span>
          {locked && (
            <span className="flex flex-col gap-1">
              <span className="flex flex-wrap gap-1">
                {task.missing.map((m) => (
                  <NeedsChip key={m} requirement={m} locked={m === 'emirates_id'} />
                ))}
              </span>
              {task.bridge && <span className="type-body-sm text-ink-muted">{t('journey.meanwhile', { bridge: task.bridge })}</span>}
            </span>
          )}
        </span>
        <CaretRight size={20} weight="bold" aria-hidden className="shrink-0" />
      </Link>
    </motion.li>
  );
}
