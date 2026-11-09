import { ArrowClockwise, WifiSlash } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RequestError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export function EmptyState({ title, body, action, art = 'skyline', className }: { title: string; body?: ReactNode; action?: ReactNode; art?: 'skyline' | 'ev' | 'none'; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-3xl bg-white card-outline px-6 pt-6 text-center', art === 'none' ? 'pb-6' : 'pb-0 overflow-hidden', className)}>
      <p className="type-title">{title}</p>
      {body && <p className="type-body-sm text-ink-muted">{body}</p>}
      {action}
      {art === 'skyline' && <img src="/illustrations/dubai-skyline-line.png" alt="" className="mt-2 h-10 w-full object-cover object-left" />}
      {art === 'ev' && <img src="/illustrations/ev-charging.png" alt="" className="mt-2 h-24 w-auto pb-4" />}
    </div>
  );
}

export function ErrorState({ error, message, onRetry }: { error?: unknown; message?: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  const offline = error instanceof RequestError && error.offline;
  const text = offline ? t('common.offlineNotSaved') : (message ?? (error instanceof RequestError ? error.message : t('common.loadError')));
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-3xl border-[2.5px] border-alert bg-white p-6">
      <div className="flex items-center gap-2 text-alert">
        {offline ? <WifiSlash size={20} weight="bold" aria-hidden /> : null}
        <p className="type-title">{offline ? t('offline.banner') : t('common.loadError').split('.')[0]}</p>
      </div>
      <p className="type-body-sm text-ink">{text}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <ArrowClockwise size={20} weight="bold" aria-hidden />
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}
