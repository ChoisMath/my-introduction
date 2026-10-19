import { expect, test, type Page } from '@playwright/test';

// 픽스처에는 모션 카드가 2장뿐이라 "한 줄에 몇 개"는 DOM 개수가 아니라 계산된 그리드 열 수로 본다.
const cols = (page: Page, testId: string) =>
  page.getByTestId(testId).evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
const box = async (page: Page, testId: string) => (await page.getByTestId(testId).boundingBox())!;

test.describe('1920 (FHD)', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('galleries use 6 / 4 columns and the nav spans the width', async ({ page }) => {
    await page.goto('/ai/motion/');
    expect(await cols(page, 'motion-grid')).toBe(6);
    const nav = (await page.getByRole('navigation', { name: 'primary' }).boundingBox())!;
    expect(nav.width).toBeGreaterThan(1800);
    await page.goto('/ai/slide/');
    expect(await cols(page, 'slide-grid')).toBe(4);
  });

  test('motion detail is two-column: video left, prompt buttons right', async ({ page }) => {
    await page.goto('/ai/motion/01-pixel/');
    const video = await box(page, 'motion-video');
    const copy = await box(page, 'copy-prompt-en');
    expect(copy.x).toBeGreaterThan(video.x + video.width);
    expect(copy.y).toBeLessThan(video.y + video.height);
  });

  test('hero background spans the viewport while the text stays inside the gutter', async ({ page }) => {
    await page.goto('/');
    const viewport = await page.evaluate(() => document.documentElement.clientWidth);
    const stage = (await page.locator('section#hero svg[aria-hidden]').boundingBox())!;
    expect(Math.round(stage.width)).toBe(viewport);
    const h1 = (await page.locator('section#hero h1').boundingBox())!;
    expect(h1.x).toBeGreaterThanOrEqual(40);
  });
});

test.describe('2560 (QHD)', () => {
  test.use({ viewport: { width: 2560, height: 1440 } });

  test('content is capped at 1920 and centered', async ({ page }) => {
    await page.goto('/ai/motion/');
    const viewport = await page.evaluate(() => document.documentElement.clientWidth);
    const grid = await box(page, 'motion-grid');
    expect(Math.round(grid.width)).toBeLessThanOrEqual(1920);
    expect(Math.round(grid.x)).toBe(Math.round(viewport - grid.x - grid.width));
  });
});

test.describe('1024 (lg) keeps the detail in one column', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('motion detail stacks', async ({ page }) => {
    await page.goto('/ai/motion/01-pixel/');
    const video = await box(page, 'motion-video');
    const copy = await box(page, 'copy-prompt-en');
    expect(copy.y).toBeGreaterThan(video.y + video.height);
  });
});
