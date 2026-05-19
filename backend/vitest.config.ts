import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 85, functions: 85, branches: 85, statements: 85 },
      include: ['src/**/*.ts'],
      exclude: [
        'src/server.ts',
        'src/scripts/**',
        'src/test/**',
        'src/**/*.test.ts',
        'dist/**',
        'scripts/**',
        'vitest.config.ts',
      ],
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
