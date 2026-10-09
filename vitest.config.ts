import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@me/content': path.resolve(__dirname, 'content/index.ts') } },
  test: {
    include: [
      'content/**/*.test.ts',
      'scripts/**/*.test.ts',
      'web/src/lib/**/*.test.ts',
      'video/src/**/*.test.ts',
    ],
    environment: 'node',
  },
});
