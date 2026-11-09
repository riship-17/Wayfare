import { House, Lifebuoy, MapTrifold, Path, Train, UserCircle, UsersThree, Wallet, type Icon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router';
import { WayfareLogo } from '@/components/brand/WayfarePin';
import { cn } from '@/lib/cn';

const MAIN: { to: string; label: string; icon: Icon; end?: boolean }[] = [
  { to: '/app', label: 'nav.home', icon: House, end: true },
  { to: '/app/journey', label: 'nav.journey', icon: Path },
  { to: '/app/housing', label: 'nav.housing', icon: MapTrifold },
  { to: '/app/transit', label: 'nav.transit', icon: Train },
  { to: '/app/me', label: 'nav.me', icon: UserCircle },
];
const MORE: { to: string; label: string; icon: Icon }[] = [
  { to: '/app/budget', label: 'home.budget', icon: Wallet },
  { to: '/app/essentials', label: 'home.essentials', icon: Lifebuoy },
  { to: '/app/community', label: 'home.community', icon: UsersThree },
];

/** Desktop navigation: a sticky ink sidebar. Phones use the floating tab bar instead. */
export function SideNav({ pathname }: { pathname: string }) {
  const { t } = useTranslation();
  const item = (active: boolean) => cn('tap flex min-h-11 items-center gap-3 rounded-full px-4 type-button-sm', active ? 'bg-cornflower text-ink' : 'text-white hover:bg-ink-soft');
  return (
    <aside className="on-ink sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 bg-ink p-6 md:flex">
      <Link to="/" className="tap self-start rounded-full" aria-label="Wayfare website">
        <WayfareLogo tone="white" size="sm" />
      </Link>
      <nav aria-label={t('nav.main')} className="flex flex-col gap-1">
        {MAIN.map(({ to, label, icon: I, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => item(isActive)}>
            <I size={20} weight="bold" aria-hidden />
            {t(label)}
          </NavLink>
        ))}
        <p className="mt-6 mb-2 px-4 type-overline text-white">More</p>
        {MORE.map(({ to, label, icon: I }) => (
          <NavLink key={to} to={to} className={() => item(pathname.startsWith(to))}>
            <I size={20} weight="bold" aria-hidden />
            {t(label)}
          </NavLink>
        ))}
      </nav>
      <p className="mt-auto type-caption text-white">{t('brand.line')}</p>
    </aside>
  );
}
