// e2e 서버가 읽을 Volume 을 만든다: 01-pixel·17-embroidery 두 개만 렌더된 상태 + 표식이 든 관리자 데이터.
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildManifest } from './media/manifest';

const web = path.resolve(import.meta.dirname, '../web');
const root = path.join(web, 'e2e/.volume');
const fixtures = path.join(web, 'e2e/fixtures');
export const RENDERED = ['01-pixel', '17-embroidery'];

rmSync(root, { recursive: true, force: true });
for (const id of RENDERED) {
  const dir = path.join(root, 'media/motion', id);
  mkdirSync(dir, { recursive: true });
  copyFileSync(path.join(fixtures, 'tiny.mp4'), path.join(dir, 'video.mp4'));
  copyFileSync(path.join(fixtures, 'tiny.mp4'), path.join(dir, 'preview.mp4'));
  copyFileSync(path.join(fixtures, 'tiny.webp'), path.join(dir, 'poster.webp'));
}
const manifest = await buildManifest(root);
writeFileSync(path.join(root, 'media/motion/manifest.json'), JSON.stringify(manifest));
mkdirSync(path.join(root, 'private'), { recursive: true });
writeFileSync(path.join(root, 'private/motion-admin.json'), JSON.stringify(RENDERED.map((id) => ({
  id,
  prompt: `E2E-ADMIN-MARKER ## 1. Channel\n- Name: {{Channel name=Chois의 바이브코딩}}\n- {{-Numbers=Show numbers}}`,
  ko: `E2E-ADMIN-MARKER ## 1. 채널\n- 이름: {{채널 이름=Chois의 바이브코딩}}`,
  shots: [['0.0–1.0', 'E2E-ADMIN-MARKER 장면', '이유']],
  cues: [['0.000', 'E2E-ADMIN-MARKER kick', 'first frame']],
}))));
console.info(`e2e volume ready: ${root}`);
