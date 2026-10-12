// e2e 서버가 읽을 Volume 을 만든다: 01-pixel·17-embroidery 두 개만 렌더된 상태 + 표식이 든 관리자 데이터.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { buildManifest } from './media/manifest';

const web = path.resolve(import.meta.dirname, '../web');
const root = path.join(web, 'e2e/.volume');
const fixtures = path.join(web, 'e2e/fixtures');
export const RENDERED = ['01-pixel', '17-embroidery'];
export const E2E_MEMBER = 'viewer@example.com';
export const E2E_PENDING = 'pending@example.com';
export const E2E_PENDING2 = 'pending2@example.com';

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

// 열람자 DB 는 E2E_DATABASE_URL 로만 받는다. .env.local 이나 셸의 DATABASE_URL(운영일 수 있음)은 절대 쓰지 않는다.
const dbUrl = process.env.E2E_DATABASE_URL;
if (dbUrl) {
  const url = new URL(dbUrl);
  const host = url.hostname;
  // ?host= 파라미터는 pg 가 호스트명보다 우선하므로 허용하지 않는다.
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host) || url.searchParams.has('host')) throw new Error(`E2E_DATABASE_URL must point to localhost, got ${dbUrl.replace(/:[^:@/]*@/, ':***@')}`);
  execFileSync('npx', ['prisma', 'migrate', 'deploy', '--config', path.join(web, 'prisma.config.ts')], { cwd: web, stdio: 'inherit', env: { ...process.env, DATABASE_URL: dbUrl } });
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  await client.query('TRUNCATE "Member" RESTART IDENTITY');
  await client.query(
    `INSERT INTO "Member" (email, name, affiliation, status, "decidedBy", "decidedAt") VALUES
       ($1, '등록교사', '테스트고등학교', 'APPROVED', 'admin@example.com', now()),
       ($2, '대기교사', '대기중학교', 'PENDING', NULL, NULL),
       ($3, '대기교사2', '대기중학교2', 'PENDING', NULL, NULL)`,
    [E2E_MEMBER, E2E_PENDING, E2E_PENDING2],
  );
  await client.end();
  console.info(`e2e member db ready: ${host}`);
}
