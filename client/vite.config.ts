import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'brand/*.svg', 'illustrations/*.png', 'offline/*.json', 'og-image.png'],
      manifest: {
        name: 'Wayfare',
        short_name: 'Wayfare',
        description: 'One trusted, guided journey for international students arriving in Dubai.',
        start_url: '/app',
        scope: '/',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#050505',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/rates'),
            handler: 'NetworkFirst',
            options: { cacheName: 'wf-rates', networkTimeoutSeconds: 4, expiration: { maxEntries: 2 } },
          },
          {
            urlPattern: ({ url }) => /^\/api\/v1\/(listings|journey|essentials|costs|institutions|transit\/network|budget\/me|events|groups)/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'wf-api', expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 14 } },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: { cacheName: 'wf-images', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: false } },
  },
  preview: {
    port: 4173,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: false } },
  },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 900 },
});
