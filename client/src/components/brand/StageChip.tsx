import type { Stage } from '@wayfare/shared';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export const STAGE_BG: Record<Stage, string> = { prepare: 'bg-sunshine', arrive: 'bg-lilac', settle: 'bg-blush' };
const NUM: Record<Stage, number> = { prepare: 1, arrive: 2, settle: 3 };

export function StageChip({ stage, className }: { stage: Stage; className?: string }) {
  const { t } = useTranslation();
  return (
    <span className={cn('inline-flex min-h-7 items-center gap-1 rounded-full px-3 py-0.5 type-label text-ink', STAGE_BG[stage], className)}>
      <span aria-hidden>{NUM[stage]}</span>
      <span>{t(`stage.${stage}`)}</span>
    </span>
  );
}
