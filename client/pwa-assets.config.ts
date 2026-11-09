import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Icons come from public/favicon.svg (the Wayfare pin on Cornflower Blue).
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#548CFF' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#548CFF' } },
  },
  images: ['public/favicon.svg'],
});
