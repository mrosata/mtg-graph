import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['pipeline/**/*.test.ts', 'shared/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./pipeline/test-setup.ts'],
  },
});
