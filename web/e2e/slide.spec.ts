import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { SlideFamily } from '@me/content';
import { arrange } from '../src/components/slide-gallery/slide-order';
import { MARKER, signInAs } from './session';

const PAGE = '/ai/slide/';
type Item = { id: string; no: number; name: string; family: SlideFamily; added: string; slides: number; cover: number; body: number };
const all = JSON.parse(readFileSync(path.resolve('../content/slide/public.json'), 'utf8')) as Item[];
const rendered = all.filter((s) => ['24', '63'].includes(s.id));
const cards = (page: Page) => page.getByTestId(/^slide-card-\d+$/);

test('hub tab shows and only rendered styles are listed', async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.getByRole('link', { name: '슬라이드', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(cards(page)).toHaveCount(rendered.length);
});

test('family chip filters and survives reload', async ({ page }) => {
  await page.goto(PAGE);
  await page.getByTestId('slide-chips').getByRole('button', { name: /업무·보고/ }).click();
  await expect(cards(page)).toHaveCount(1);
  await expect(page).toHaveURL(/\?f=work$/);
  await page.reload();
  await expect(cards(page)).toHaveCount(1);
  await page.getByTestId('slide-chips').getByRole('button', { name: /전체/ }).click();
  await expect(cards(page)).toHaveCount(rendered.length);
});

test('sort menu reorders cards', async ({ page }) => {
  await page.goto(PAGE);
  for (const [label, sort] of [['번호순', 'no'], ['최신순', 'new'], ['인기순', 'pop']] as const) {
    await page.getByTestId('slide-sort').getByRole('button', { name: /정렬/ }).click();
    await page.getByRole('menuitemradio', { name: label }).click();
    const want = arrange(rendered, { family: null, sort, view: 'cover' }).map((s) => `slide-card-${s.id}`);
    await expect.poll(() => cards(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))).toEqual(want);
  }
});

test('cover/body toggle swaps the card image', async ({ page }) => {
  const s = rendered[0]!;
  await page.goto(PAGE);
  const front = page.getByTestId(`slide-card-${s.id}`).getByTestId('slide-card-front');
  await expect(front).toHaveAttribute('src', new RegExp(`/media/slide/${s.id}/t/${s.cover}\\.webp`));
  await page.getByTestId('slide-view').getByRole('button', { name: '본문' }).click();
  await expect(front).toHaveAttribute('src', new RegExp(`/media/slide/${s.id}/t/${s.body}\\.webp`));
  await expect(page).toHaveURL(/v=body/);
});

test('viewer pages through slides into the next style and closes with Escape', async ({ page }) => {
  const [first, second] = rendered as [Item, Item];
  await page.goto(PAGE);
  await page.getByTestId(`slide-card-${first.id}`).click();
  const viewer = page.getByTestId('slide-viewer');
  await expect(viewer).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`#${first.id}$`));
  await expect(viewer.getByTestId('slide-pos')).toHaveText(`1 / ${first.slides}`);
  for (let i = 0; i < first.slides; i++) await page.keyboard.press('ArrowRight');
  await expect(viewer.getByRole('heading', { name: second.name })).toBeVisible();
  await expect(viewer.getByTestId('slide-pos')).toHaveText(`1 / ${second.slides}`);
  await page.keyboard.press('ArrowLeft');
  await expect(viewer.getByRole('heading', { name: first.name })).toBeVisible();
  await expect(viewer.getByTestId('slide-pos')).toHaveText(`${first.slides} / ${first.slides}`);
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
  await expect(page).toHaveURL(/\/ai\/slide\/$/);
});

test('hash deep links open the style, even when filtered out, and bad hashes are ignored', async ({ page }) => {
  const target = rendered.find((s) => s.family === 'work')!;
  await page.goto(`${PAGE}?f=hand#${target.id}`);
  await expect(page.getByTestId('slide-viewer').getByRole('heading', { name: target.name })).toBeVisible();
  // 필터 밖에서 연 상세 창은 닫을 때까지 전체 순서를 유지해야 한다.
  const viewer = page.getByTestId('slide-viewer');
  for (let i = 0; i < target.slides; i++) await page.keyboard.press('ArrowRight');
  await expect(viewer.getByTestId('slide-style-count')).toHaveText(`1 / ${rendered.length}`);
  await viewer.getByRole('button', { name: '이전 스타일' }).click();
  await expect(viewer.getByRole('heading', { name: target.name })).toBeVisible();
  for (const bad of ['#999', '#%E0']) {
    await page.goto(`${PAGE}${bad}`);
    await expect(cards(page).first()).toBeVisible();
    await expect(page.getByTestId('slide-viewer')).toHaveCount(0);
  }
});

// 스타일 프롬프트는 오빠두엑셀의 허락을 받아 공개(2026-10-19). 로그인 없이 보이고 복사된다.
test('anonymous visitor sees and copies the prompt without a sign-in dialog', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  expect(await (await page.request.get(PAGE)).text()).toContain(MARKER);
  await page.goto(`${PAGE}#${rendered[0]!.id}`);
  await expect(page.getByTestId('slide-prompt')).toContainText(MARKER);
  await page.getByTestId('copy-slide-prompt').click();
  await expect(page.getByTestId('copy-slide-prompt')).toHaveText('복사됨');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(MARKER);
  await expect(page.getByTestId('signin-dialog')).toHaveCount(0);
});

test('approved member sees and copies the prompt', async ({ browser }) => {
  test.skip(!process.env.E2E_DATABASE_URL, 'DB 필요');
  const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  await signInAs(ctx, 'viewer@example.com');
  const page = await ctx.newPage();
  await page.goto(`${PAGE}#${rendered[0]!.id}`);
  await expect(page.getByTestId('slide-prompt')).toContainText(MARKER);
  await page.getByTestId('copy-slide-prompt').click();
  await expect(page.getByTestId('copy-slide-prompt')).toHaveText('복사됨');
  await ctx.close();
});

test('mobile layout has no horizontal page scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(PAGE);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await cards(page).first().click();
  await expect(page.getByTestId('slide-viewer-img')).toBeVisible();
  await page.getByTestId('copy-slide-prompt').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('copy-slide-prompt')).toBeVisible();
});

test('laptop-width viewer keeps the side panel on screen', async ({ page }) => {
  for (const width of [1024, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`${PAGE}#${rendered[0]!.id}`);
    for (const target of [page.getByRole('button', { name: '닫기' }), page.getByTestId('copy-slide-prompt')]) {
      const box = await target.boundingBox();
      expect(box, `${width}`).not.toBeNull();
      expect(box!.x + box!.width, `${width}`).toBeLessThanOrEqual(width);
    }
  }
});
