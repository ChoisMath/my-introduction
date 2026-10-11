import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@me/content': path.resolve(__dirname, 'content/index.ts'),
      '@/': path.resolve(__dirname, 'web/src') + '/',
      'server-only': path.resolve(__dirname, 'vitest.empty.ts'),
    },
  },
  test: {
    include: [
      'content/**/*.test.ts',
      'scripts/**/*.test.ts',
      'web/src/**/*.test.ts',
      'video/src/**/*.test.ts',
    ],
    environment: 'node',
  },
});
