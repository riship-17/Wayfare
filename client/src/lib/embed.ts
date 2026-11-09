/** True when the app runs inside an iframe (the desktop phone frame or the landing page). */
export const isEmbedded = typeof window !== 'undefined' && (window.self !== window.top || new URLSearchParams(window.location.search).has('embed'));

/** Inside the desktop stage, keep the outer address bar in step with the app. */
export function syncParentUrl(path: string) {
  if (!isEmbedded) return;
  try {
    const parent = window.parent;
    if (parent !== window && parent.location.pathname.startsWith('/app')) parent.history.replaceState(null, '', path);
  } catch {
    // cross origin parent: nothing to sync
  }
}
