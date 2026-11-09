import { createBrowserRouter, Navigate, Outlet, ScrollRestoration, type RouteObject } from 'react-router';
import { Toaster } from 'sonner';
import { RouteError } from './features/RouteError';

/** Skip link, toasts and scroll restoration for every page. */
function Root() {
  return (
    <>
      <a href="#main" className="sr-only-focusable fixed start-4 top-4 z-50 rounded-full bg-cornflower px-4 py-2 type-button-sm text-ink">
        Skip to content
      </a>
      <Outlet />
      <Toaster
        position="top-center"
        offset={16}
        toastOptions={{
          duration: 4000,
          classNames: {
            toast: '!rounded-3xl !border-[2.5px] !border-ink !bg-white !text-ink !shadow-float !font-sans !px-4 !py-3',
            title: '!type-body-sm !font-semibold',
            description: '!type-caption !text-ink-muted',
            error: '!border-alert',
          },
        }}
      />
      <ScrollRestoration />
    </>
  );
}

const lazy = (load: () => Promise<Record<string, unknown>>, name: string) => async () => ({ Component: (await load())[name] as React.ComponentType });

const appRoutes: RouteObject[] = [
  { index: true, lazy: lazy(() => import('./features/home/Home'), 'Home') },
  { path: 'welcome', lazy: lazy(() => import('./features/onboarding/Welcome'), 'Welcome') },
  { path: 'create', lazy: async () => ({ Component: (await import('./features/onboarding/Auth')).CreateScreen }) },
  { path: 'sign-in', lazy: async () => ({ Component: (await import('./features/onboarding/Auth')).SignInScreen }) },
  { path: 'setup', element: <Navigate to="/app/setup/university" replace /> },
  { path: 'setup/:step', lazy: lazy(() => import('./features/onboarding/Setup'), 'Setup') },
  { path: 'journey', lazy: lazy(() => import('./features/journey/Journey'), 'Journey') },
  { path: 'journey/:key', lazy: lazy(() => import('./features/journey/TaskDetail'), 'TaskDetail') },
  { path: 'housing', lazy: lazy(() => import('./features/housing/Housing'), 'Housing') },
  { path: 'housing/:id', lazy: lazy(() => import('./features/housing/ListingDetail'), 'ListingDetail') },
  { path: 'transit', lazy: lazy(() => import('./features/transit/Transit'), 'Transit') },
  { path: 'budget', lazy: lazy(() => import('./features/budget/Budget'), 'Budget') },
  { path: 'essentials', lazy: lazy(() => import('./features/essentials/Essentials'), 'Essentials') },
  { path: 'essentials/:key', lazy: lazy(() => import('./features/essentials/ServiceDetail'), 'ServiceDetail') },
  { path: 'community', lazy: lazy(() => import('./features/community/Community'), 'Community') },
  { path: 'me', lazy: lazy(() => import('./features/me/Me'), 'Me') },
  { path: 'me/about', lazy: lazy(() => import('./features/me/About'), 'About') },
];

export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      { path: '/', lazy: lazy(() => import('./features/landing/Landing'), 'Landing') },
      { path: '/privacy', lazy: async () => ({ Component: (await import('./features/landing/Legal')).Privacy }) },
      { path: '/terms', lazy: async () => ({ Component: (await import('./features/landing/Legal')).Terms }) },
      {
        path: '/app',
        lazy: lazy(() => import('./features/AppShell'), 'AppRoot'),
        children: appRoutes,
      },
      { path: '/share/:token', lazy: lazy(() => import('./features/share/FamilyView'), 'FamilyView') },
      { path: '/admin/login', lazy: lazy(() => import('./features/admin/AdminLogin'), 'AdminLogin') },
      {
        path: '/admin',
        lazy: lazy(() => import('./features/admin/AdminLayout'), 'AdminLayout'),
        children: [
          { index: true, element: <Navigate to="/admin/listings" replace /> },
          { path: 'listings', lazy: lazy(() => import('./features/admin/AdminListings'), 'AdminListings') },
          { path: 'events', lazy: lazy(() => import('./features/admin/AdminEvents'), 'AdminEvents') },
          { path: 'checklist', lazy: lazy(() => import('./features/admin/AdminChecklist'), 'AdminChecklist') },
          { path: 'reports', lazy: lazy(() => import('./features/admin/AdminReports'), 'AdminReports') },
        ],
      },
      { path: '/dev/kit', lazy: lazy(() => import('./features/dev/Kit'), 'Kit') },
      { path: '*', lazy: lazy(() => import('./features/NotFound'), 'NotFound') },
    ],
  },
]);
