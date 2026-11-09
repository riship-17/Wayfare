import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Skyline } from '@/components/brand/Illustrations';
import { WayfareLogo } from '@/components/brand/WayfarePin';
import { NotFound } from './NotFound';

export function RouteError() {
  const err = useRouteError();
  if (isRouteErrorResponse(err) && err.status === 404) return <NotFound />;
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  return (
    <main id="main" className="flex min-h-dvh flex-col bg-paper">
      <div className="mx-auto flex w-full max-w-[680px] flex-1 flex-col items-start justify-center gap-6 px-4 py-12" role="alert">
        <WayfareLogo />
        <h1 className="type-display">{offline ? 'This screen is not saved for offline yet' : 'Something went wrong on this screen'}</h1>
        <p className="type-body text-ink-muted">{offline ? 'Open it once while you are online. Transit and Essentials always work offline.' : 'Reload the page. If it keeps happening, go back to the start.'}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => window.location.reload()} className="tap inline-flex min-h-12 items-center rounded-full bg-cornflower px-6 type-button hover:bg-cornflower-hover">
            Reload
          </button>
          <Link to="/app/transit" className="tap inline-flex min-h-12 items-center rounded-full bg-white px-6 type-button card-outline">
            Open Transit
          </Link>
        </div>
      </div>
      <Skyline className="h-20" />
    </main>
  );
}
