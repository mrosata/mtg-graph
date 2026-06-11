import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MTG Graph',
        short_name: 'MTG Graph',
        description:
          'Browse every Magic: The Gathering Standard card as a searchable interaction graph.',
        theme_color: '#0c0a0d',
        background_color: '#0c0a0d',
        display: 'standalone',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /cards-[\w-]+\.json($|\?)/,
            handler: 'CacheFirst',
            options: { cacheName: 'card-data', expiration: { maxEntries: 4 } },
          },
        ],
      },
    }),
  ],
  resolve: { alias: { '@shared': resolve(__dirname, '../shared') } },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
