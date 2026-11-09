import { ArrowLeft } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/cn';

/** Screen title with an optional back button. Every pushed screen has a way back. */
export function ScreenHeader({ title, sub, back, action, className, overline }: { title: string; sub?: ReactNode; back?: string | true; action?: ReactNode; className?: string; overline?: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <header className={cn('flex flex-col gap-2 pt-6', className)}>
      {back && (
        <button
          type="button"
          onClick={() => (back === true ? (window.history.length > 1 ? navigate(-1) : navigate('/app')) : navigate(back))}
          className="tap -ms-3 inline-flex size-11 items-center justify-center rounded-full hover:bg-cornflower-wash"
          aria-label={t('nav.back')}
        >
          <ArrowLeft size={20} weight="bold" aria-hidden />
        </button>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          {overline}
          <h1 className="type-heading-1">{title}</h1>
          {sub && <p className="type-body-sm text-ink-muted">{sub}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function SectionTitle({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 id={id} className="type-heading-3">
        {children}
      </h2>
      {action}
    </div>
  );
}
