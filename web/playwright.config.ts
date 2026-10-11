// standalone 서버(.next/standalone)를 띄워 검사한다. 먼저 `npm run build -w web` 이 필요하다.
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
// standalone server.js 가 시작 시 chdir 하므로 상대경로는 fixture 위치와 어긋난다. 절대경로로 고정.
const E2E_VOLUME = path.resolve(import.meta.dirname, 'e2e/.volume');

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  expect: { timeout: 10_000 },
  use: { baseURL: `http://localhost:${PORT}`, ...devices['Desktop Chrome'] },
  webServer: {
    command: 'npx tsx ../scripts/e2e-fixture.ts && node .next/standalone/web/server.js',
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      RAILWAY_VOLUME_MOUNT_PATH: E2E_VOLUME,
      AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret-00',
      AUTH_GOOGLE_ID: 'e2e-client',
      AUTH_GOOGLE_SECRET: 'e2e-secret',
      ADMIN_EMAILS: 'admin@example.com',
      MEDIA_UPLOAD_TOKEN: 'e2e-upload-token',
    },
  },
});
