import { Glass } from '@samasante/liquid-glass';
import { House, MapTrifold, Path, Train, UserCircle, type Icon } from '@phosphor-icons/react';
import { Component, useSyncExternalStore, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';

const TABS: { to: string; key: 'home' | 'journey' | 'housing' | 'transit' | 'me'; icon: Icon; end?: boolean; match?: string[] }[] = [
  { to: '/app', key: 'home', icon: House, end: true, match: ['/app/budget', '/app/essentials', '/app/community'] },
  { to: '/app/journey', key: 'journey', icon: Path },
  { to: '/app/housing', key: 'housing', icon: MapTrifold },
  { to: '/app/transit', key: 'transit', icon: Train },
  { to: '/app/me', key: 'me', icon: UserCircle },
];

const TINT = 'rgba(5,5,5,0.84)';

function subscribe(cb: () => void) {
  const mq = window.matchMedia('(prefers-reduced-transparency: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
const useReducedTransparency = () => useSyncExternalStore(subscribe, () => window.matchMedia('(prefers-reduced-transparency: reduce)').matches, () => false);

/** If the glass component fails, fall back to the solid ink pill. */
class GlassBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function TabBar({ pathname }: { pathname: string }) {
  const { t } = useTranslation();
  const reduced = useReducedTransparency();

  const links = (
    <ul className="flex items-center gap-1 p-1">
      {TABS.map(({ to, key, icon: I, end, match }) => {
        const extra = match?.some((m) => pathname.startsWith(m));
        return (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'tap flex h-14 w-16 flex-col items-center justify-center gap-0.5 rounded-full text-white outline-offset-0 focus-visible:outline-cornflower',
                  isActive || extra ? 'bg-cornflower text-ink' : 'hover:bg-white/10',
                )
              }
              aria-current={extra ? 'page' : undefined}
            >
              <I size={20} weight="bold" aria-hidden />
              <span className="type-caption-strong">{t(`nav.${key}`)}</span>
            </NavLink>
          </li>
        );
      })}
    </ul>
  );

  const solid = (
    <div className="rounded-full bg-ink shadow-float" style={{ background: '#050505' }}>
      {links}
    </div>
  );

  return (
    <nav aria-label={t('nav.main')} className="on-ink fixed inset-x-0 bottom-0 z-30 flex justify-center md:hidden pb-[max(1rem,env(safe-area-inset-bottom))]" data-testid="tab-bar">
      {reduced ? (
        solid
      ) : (
        <GlassBoundary fallback={solid}>
          <Glass className="rounded-full shadow-float" style={{ background: TINT, borderRadius: 9999 }}>
            {links}
          </Glass>
        </GlassBoundary>
      )}
    </nav>
  );
}
