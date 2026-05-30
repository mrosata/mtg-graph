import { defineConfig } from '@playwright/test';

// Run e2e tests against the BUILT app (vite preview), not the dev server.
// This catches build-time issues (TS, PWA manifest, asset hashing) that dev mode hides.
// The MTG card artifact at app/public/data/cards-standard.json is already on disk;
// `npm run build` just hashes assets — it does NOT rebuild the card graph.
const PORT = 4173;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // shared IndexedDB state between cases within a file requires serial order
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
