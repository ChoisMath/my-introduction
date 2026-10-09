// Pretendard 가변 폰트를 Remotion 의 public/ 으로 복사
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const src = path.join(path.dirname(require.resolve('pretendard/package.json')), 'dist/web/variable/woff2/PretendardVariable.woff2');
mkdirSync('public/fonts', { recursive: true });
copyFileSync(src, 'public/fonts/PretendardVariable.woff2');
console.info('copied PretendardVariable.woff2');
