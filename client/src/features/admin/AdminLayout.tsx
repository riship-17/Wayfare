import { useQuery } from '@tanstack/react-query';
import { CalendarBlank, Flag, ListChecks, ShieldCheck, SignOut } from '@phosphor-icons/react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router';
import { WayfareLogo } from '@/components/brand/WayfarePin';
import { Skeleton } from '@/components/ui/Skeleton';
import { get } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useLogout, useMe } from '@/lib/queries';

export interface Overview {
  institution: { id: string; name: string };
  counts: { pending: number; verified: number; rejected: number; reports: number; events: number };
}

export const useOverview = () => useQuery({ queryKey: ['admin', 'overview'], queryFn: () => get<Overview>('/admin/overview') });

const NAV = [
  { to: '/admin/listings', label: 'Listings', icon: ShieldCheck, count: (c: Overview['counts']) => c.pending },
  { to: '/admin/events', label: 'Events', icon: CalendarBlank, count: () => 0 },
  { to: '/admin/checklist', label: 'Checklist', icon: ListChecks, count: () => 0 },
  { to: '/admin/reports', label: 'Broker reports', icon: Flag, count: (c: Overview['counts']) => c.reports },
];

export function AdminLayout() {
  const me = useMe();
  const overview = useOverview();
  const logout = useLogout();
  const navigate = useNavigate();
  const user = me.data?.user;

  if (me.isPending) return <div className="p-8"><Skeleton className="h-12 w-64 rounded-full" /></div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role === 'student') return <Navigate to="/admin/login?student=1" replace />;

  return (
    <div className="flex min-h-dvh flex-col bg-paper md:flex-row">
      <aside className="on-ink flex flex-col gap-6 bg-ink p-6 text-white md:sticky md:top-0 md:h-dvh md:w-72">
        <WayfareLogo tone="white" size="sm" />
        <div className="flex flex-col gap-1">
          <p className="type-overline text-white">University portal</p>
          <p className="type-title text-white">{overview.data?.institution.name ?? ' '}</p>
          <p className="type-caption text-white">{user.name}</p>
        </div>
        <nav aria-label="Portal" className="flex flex-row flex-wrap gap-1 md:flex-col">
          {NAV.map(({ to, label, icon: I, count }) => {
            const n = overview.data ? count(overview.data.counts) : 0;
            return (
              <NavLink key={to} to={to} className={({ isActive }) => cn('tap flex min-h-11 items-center gap-3 rounded-full px-4 type-button-sm', isActive ? 'bg-cornflower text-ink' : 'text-white hover:bg-ink-soft')}>
                <I size={20} weight="bold" aria-hidden />
                <span className="flex-1">{label}</span>
                {n > 0 && <span className="rounded-full bg-white px-2 type-caption-strong text-ink">{n}</span>}
              </NavLink>
            );
          })}
        </nav>
        <button type="button" onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/admin/login') })} className="tap mt-auto inline-flex min-h-11 items-center gap-2 rounded-full px-4 type-button-sm text-white hover:bg-ink-soft">
          <SignOut size={20} weight="bold" aria-hidden />
          Sign out
        </button>
      </aside>
      <main id="main" className="flex-1 px-6 py-8 md:px-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function AdminTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="type-display">{title}</h1>
      {sub && <p className="type-body text-ink-muted">{sub}</p>}
    </header>
  );
}
