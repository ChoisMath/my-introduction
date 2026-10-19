import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { signInAs } from './session';

const MARKER = 'E2E-ADMIN-MARKER';
// 완성 프롬프트(MARKER 포함)는 공개다(2026-10-19). 프롬프트를 싣지 않는 화면과 원문 빈칸 템플릿·빌드 산출물만 검사한다.
const NO_PROMPT_PAGES = ['/', '/en/', '/ai/motion/', '/ai/join/'];
const PROMPT_PAGES = ['/ai/motion/01-pixel/', '/ai/motion/17-embroidery/', '/ai/slide/'];

test('guest and pending accounts read prompts but never reach member screens', async ({ browser }) => {
  test.skip(!process.env.E2E_DATABASE_URL, 'DB 필요');
  for (const email of ['stranger@example.com', 'pending2@example.com']) {
    const ctx = await browser.newContext();
    await signInAs(ctx, email);
    for (const p of [...NO_PROMPT_PAGES, ...PROMPT_PAGES]) {
      const html = await (await ctx.request.get(p)).text();
      if (NO_PROMPT_PAGES.includes(p)) expect(html, `${email} ${p}`).not.toContain(MARKER);
      expect(html, `${email} ${p}`).not.toContain('{{Channel name=');
    }
    for (const p of ['/ai/motion/admin/', '/ai/motion/admin/01-pixel/', '/ai/admin/members/']) {
      expect((await ctx.request.get(p, { maxRedirects: 0 })).status(), `${email} ${p}`).toBe(404);
    }
    await ctx.close();
  }
});

test('no raw template or admin text leaks into public html or build output', async ({ request }) => {
  for (const p of NO_PROMPT_PAGES) {
    expect(await (await request.get(p)).text(), p).not.toContain(MARKER);
  }
  for (const p of [...NO_PROMPT_PAGES, ...PROMPT_PAGES]) {
    expect(await (await request.get(p)).text(), p).not.toContain('{{Channel name=');
  }
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
    const f = path.join(dir, n);
    return statSync(f).isDirectory() ? walk(f) : [f];
  });
  // 관리자 UI 코드가 가진 '## 9. Sound cue sheet' 제목 문자열은 데이터가 아니므로 검사 대상이 아니다.
  const files = walk(path.resolve('.next/standalone/web/.next')).filter((f) => /\.(js|html|json|rsc|body)$/.test(f));
  for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/\{\{Channel name=|E2E-ADMIN-MARKER/);
});

test('private files and traversal attempts are not served', async ({ request }) => {
  for (const p of ['/media/private/motion-admin.json', '/media/motion/..%2F..%2Fprivate%2Fmotion-admin.json', '/media/motion/manifest.json', '/media/private/slide-admin.json', '/media/slide/manifest.json', '/media/slide/24/..%2F..%2Fprivate%2Fslide-admin.json', '/media/slide/24/1.png']) {
    expect((await request.get(p)).status(), p).toBe(404);
  }
});

test('upload and manifest apis reject missing or wrong tokens', async ({ request }) => {
  const put = await request.put('/api/media?path=media/motion/01-pixel/video.mp4', { data: 'x', headers: { authorization: 'Bearer wrong' } });
  expect(put.status()).toBe(401);
  expect((await request.get('/api/media/manifest')).status()).toBe(401);
  const ok = await request.get('/api/media/manifest', { headers: { authorization: 'Bearer e2e-upload-token' } });
  expect(Object.keys(await ok.json())).toContain('media/motion/01-pixel/video.mp4');
  const slide = await request.get('/api/media/manifest?set=slide', { headers: { authorization: 'Bearer e2e-upload-token' } });
  expect(Object.keys(await slide.json())).toContain('media/slide/24/1.webp');
});
