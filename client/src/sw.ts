/** Registers the Workbox service worker in production builds. Dev runs without it. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {
      // the app works without a service worker, just not offline
    });
}
