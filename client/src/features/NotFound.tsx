import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Skyline } from '@/components/brand/Illustrations';
import { WayfareLogo } from '@/components/brand/WayfarePin';

export function NotFound() {
  const { t } = useTranslation();
  return (
    <main id="main" className="flex min-h-dvh flex-col bg-paper">
      <div className="mx-auto flex w-full max-w-[680px] flex-1 flex-col items-start justify-center gap-6 px-4 py-12">
        <Link to="/" className="tap rounded-full">
          <WayfareLogo />
        </Link>
        <p className="type-overline text-ink-muted">404</p>
        <h1 className="type-display">{t('notFound.title')}</h1>
        <p className="type-body text-ink-muted">{t('notFound.body')}</p>
        <Link to="/" className="tap inline-flex min-h-12 items-center rounded-full bg-cornflower px-6 type-button hover:bg-cornflower-hover">
          {t('notFound.home')}
        </Link>
      </div>
      <Skyline className="h-20" />
    </main>
  );
}
