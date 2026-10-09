import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// Remotion 이 SD 카드의 node_modules/.remotion 에 내려받은 Chrome Headless Shell 은 root 로드에서 멈춘다.
// Playwright 가 로컬 디스크(~/Library/Caches/ms-playwright)에 둔 같은 바이너리를 쓴다 (`npx playwright install chromium`).
const playwrightCache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
if (existsSync(playwrightCache)) {
  const shell = readdirSync(playwrightCache)
    .filter((d) => d.startsWith('chromium_headless_shell-'))
    .sort()
    .map((d) => path.join(playwrightCache, d, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'))
    .filter((p) => existsSync(p))
    .at(-1);
  if (shell) Config.setBrowserExecutable(shell);
}

// content 워크스페이스를 node_modules 심링크가 아닌 실제 경로로 묶어 TS 로더가 처리하게 한다.
Config.overrideWebpackConfig((current) => ({
  ...current,
  resolve: {
    ...current.resolve,
    alias: { ...(current.resolve?.alias ?? {}), '@me/content': path.resolve(process.cwd(), '../content/index.ts') },
  },
}));
