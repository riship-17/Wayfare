import { useQueryClient } from '@tanstack/react-query';
import { Ssgoi, SsgoiLayoutBoundary } from '@ssgoi/react';
import { WifiSlash } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router';
import { toast } from 'sonner';
import { TabBar } from '@/components/ui/TabBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { syncParentUrl } from '@/lib/embed';
import { SideNav } from '@/components/ui/SideNav';
import { flushOutbox, pendingCount, useOnline } from '@/lib/offline';
import { keys, useMe } from '@/lib/queries';
import { useUi } from '@/lib/store';
import { ssgoiConfig, ssgoiFramework } from '@/ssgoi';

const PUBLIC_APP = ['/app/welcome', '/app/sign-in', '/app/create'];
const NO_TABS = ['/app/welcome', '/app/sign-in', '/app/create', '/app/setup'];

/** The app is responsive: a sidebar layout on wide screens, the floating tab bar on phones. */
export function AppRoot() {
  return <AppShell />;
}

function SyncManager() {
  const online = useOnline();
  const qc = useQueryClient();
  const setPending = useUi((s) => s.setPendingSync);
  const { t } = useTranslation();

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (navigator.onLine) {
        const sent = await flushOutbox().catch(() => 0);
        if (sent > 0) {
          await qc.invalidateQueries({ queryKey: keys.journey });
          toast(t('offline.synced'));
        }
      }
      if (alive) setPending(await pendingCount());
    };
    void run();
    const timer = window.setInterval(() => void pendingCount().then(setPending), 4000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [online, qc, setPending, t]);
  return null;
}

export function AppShell() {
  const location = useLocation();
  const me = useMe();
  const online = useOnline();
  const { t } = useTranslation();
  const pending = useUi((s) => s.pendingSync);

  useEffect(() => {
    syncParentUrl(location.pathname + location.search.replace(/[?&]embed=1/, ''));
  }, [location.pathname, location.search]);

  const isPublic = PUBLIC_APP.some((p) => location.pathname.startsWith(p));
  const showTabs = !NO_TABS.some((p) => location.pathname.startsWith(p));
  const user = me.data?.user;

  if (me.isPending) {
    return (
      <div className="flex min-h-dvh flex-col gap-4 px-4 pt-12" role="status">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-8 w-1/2 rounded-full" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    );
  }
  if (!isPublic && !user) return <Navigate to="/app/welcome" replace />;
  if (user && user.role !== 'student' && !isPublic) return <Navigate to="/admin" replace />;
  if (user && !user.onboarded && !location.pathname.startsWith('/app/setup') && !isPublic) return <Navigate to="/app/setup/university" replace />;

  return (
    <Ssgoi config={ssgoiConfig} framework={ssgoiFramework}>
      <SyncManager />
      {!online && (
        <div className="on-ink sticky top-0 z-20 flex items-center justify-center gap-2 bg-ink px-4 py-2 text-white" role="status">
          <WifiSlash size={16} weight="bold" aria-hidden />
          <span className="type-caption-strong">{t('offline.banner')}</span>
        </div>
      )}
      <div className="md:flex">
        {showTabs && <SideNav pathname={location.pathname} />}
        <div className="relative z-0 min-h-dvh min-w-0 flex-1 overflow-x-clip">
          <SsgoiLayoutBoundary as="main" id="main" className={showTabs ? 'min-h-dvh bg-paper pb-24 md:pb-16' : 'min-h-dvh bg-paper md:py-12'}>
            <div className={showTabs ? 'mx-auto w-full max-w-6xl md:px-6 md:pt-4' : 'mx-auto w-full max-w-md'}>
              <Outlet />
            </div>
          </SsgoiLayoutBoundary>
        </div>
      </div>
      {showTabs && pending > 0 && (
        <p className="fixed inset-x-0 bottom-24 z-30 md:bottom-6 mx-auto w-fit rounded-full bg-white px-3 py-1 type-caption-strong card-outline" role="status">
          {t('offline.pending', { count: pending })}
        </p>
      )}
      {showTabs && <TabBar pathname={location.pathname} />}
    </Ssgoi>
  );
}
