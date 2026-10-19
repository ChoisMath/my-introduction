import { expect, test, type BrowserContext } from '@playwright/test';
import { signInAs } from './session';

const PAGE = '/ai/brand/';
const SITE = '/ai/brand/site/';
const MARKER = 'E2E-BRAND-MARKER';
const BLOCKED = ['manifest.json', 'data/brands-index.txt', '..%2F..%2Fmotion-admin.json', 'data/../manifest.json'];

// 룩북은 오빠두엑셀의 허락을 받아 누구에게나 공개(2026-10-19). 허용 목록 밖의 파일은 여전히 404 다.
async function expectCopy(ctx: BrowserContext, label: string) {
  const page = await ctx.newPage();
  await page.goto(PAGE);
  await expect(page.getByRole('link', { name: '브랜드 룩북', exact: true }), label).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('brand-gate'), label).toHaveCount(0);
  await expect(page.frameLocator('[data-testid="brand-frame"]').getByRole('heading', { name: MARKER }), label).toBeVisible();
  const json = await ctx.request.get(`${SITE}data/brands-index.json`);
  expect(json.status(), label).toBe(200);
  expect(json.headers()['content-type'], label).toContain('application/json');
  for (const p of BLOCKED) expect((await ctx.request.get(SITE + p)).status(), `${label} ${p}`).toBe(404);
  await page.close();
}

test('signed-out visitors see the copy in the brand tab, only from the allow list', async ({ browser }) => {
  const ctx = await browser.newContext();
  await expectCopy(ctx, 'signedOut');
  await ctx.close();
});

test('admin sees the same copy', async ({ browser }) => {
  const ctx = await browser.newContext();
  await signInAs(ctx, 'admin@example.com');
  await expectCopy(ctx, 'admin');
  await ctx.close();
});

test('approved, pending and guest accounts all get the copy', async ({ browser }) => {
  test.skip(!process.env.E2E_DATABASE_URL, 'DB 필요');
  for (const email of ['viewer@example.com', 'pending@example.com', 'stranger@example.com']) {
    const ctx = await browser.newContext();
    await signInAs(ctx, email);
    expect(await (await ctx.request.get(SITE)).text(), email).toContain(MARKER);
    await ctx.close();
  }
});
