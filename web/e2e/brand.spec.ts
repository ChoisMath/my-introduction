import { expect, test, type BrowserContext } from '@playwright/test';
import { signInAs } from './session';

const PAGE = '/ai/brand/';
const SITE = '/ai/brand/site/';
const MARKER = 'E2E-BRAND-MARKER';
const BLOCKED = ['manifest.json', 'data/brands-index.txt', '..%2F..%2Fmotion-admin.json', 'data/../manifest.json'];

async function expectGate(ctx: BrowserContext, label: string) {
  const page = await ctx.newPage();
  await page.goto(PAGE);
  await expect(page.getByTestId('brand-gate'), label).toBeVisible();
  await expect(page.getByTestId('brand-frame')).toHaveCount(0);
  expect(await page.content(), label).not.toContain(MARKER);
  for (const p of ['', 'index.html', 'data/brands-index.json']) expect((await ctx.request.get(SITE + p)).status(), `${label} ${p}`).toBe(404);
  await page.close();
}

test('signed-out visitors see the gate and the copy is not served', async ({ browser }) => {
  const ctx = await browser.newContext();
  await expectGate(ctx, 'signedOut');
  await ctx.close();
});

test('admin sees the copy in the brand tab, served privately and only from the allow list', async ({ browser }) => {
  const ctx = await browser.newContext();
  await signInAs(ctx, 'admin@example.com');
  const page = await ctx.newPage();
  await page.goto(PAGE);
  await expect(page.getByRole('link', { name: '브랜드 룩북', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.frameLocator('[data-testid="brand-frame"]').getByRole('heading', { name: MARKER })).toBeVisible();
  const json = await ctx.request.get(`${SITE}data/brands-index.json`);
  expect(json.status()).toBe(200);
  expect(json.headers()['content-type']).toContain('application/json');
  expect(json.headers()['cache-control']).toMatch(/^private/);
  for (const p of BLOCKED) expect((await ctx.request.get(SITE + p)).status(), p).toBe(404);
  await ctx.close();
});

test('approved members get the copy, pending and guest accounts get the gate', async ({ browser }) => {
  test.skip(!process.env.E2E_DATABASE_URL, 'DB 필요');
  const member = await browser.newContext();
  await signInAs(member, 'viewer@example.com');
  expect(await (await member.request.get(SITE)).text()).toContain(MARKER);
  await member.close();
  for (const email of ['pending@example.com', 'stranger@example.com']) {
    const ctx = await browser.newContext();
    await signInAs(ctx, email);
    await expectGate(ctx, email);
    await ctx.close();
  }
});
