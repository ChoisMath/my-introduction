import { expect, test } from '@playwright/test';
import { SECTION_IDS } from '../src/lib/sections';

for (const [path, lang] of [['/', 'ko'], ['/en/', 'en']] as const) {
  test(`${path} renders every section with lang=${lang}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    for (const id of SECTION_IDS) await expect(page.locator(`section#${id}`)).toHaveCount(1);
  });
}

test('language toggle keeps the section hash', async ({ page }) => {
  await page.goto('/#projects');
  await page.getByTestId('lang-toggle').click();
  await expect(page).toHaveURL(/\/en\/#projects$/);
  await page.getByTestId('lang-toggle').click();
  await expect(page).toHaveURL(/\/#projects$/);
});

test('hero shows name and stats shows 5 numbers', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('section#hero h1')).toHaveText('최재혁');
  await expect(page.locator('section#stats [data-count]')).toHaveCount(5);
  await expect(page.locator('section#timeline li')).toHaveCount(6 + 2 + 6);
});

test('projects shows 5 cards and books shows 3 covers', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('project-card')).toHaveCount(5);
  await expect(page.locator('section#books img')).toHaveCount(3);
});

test('lectures tabs switch rows', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('section#lectures tbody tr')).toHaveCount(9);
  await page.getByRole('tab', { name: /학생 대상/ }).click();
  await expect(page.locator('section#lectures tbody tr')).toHaveCount(4);
});

test('every image on the page actually loads', async ({ page }) => {
  await page.goto('/');
  const broken = await page.locator('img').evaluateAll((imgs) =>
    imgs.filter((img) => !(img instanceof HTMLImageElement) || !img.complete || img.naturalWidth === 0).map((img) => (img as HTMLImageElement).src),
  );
  expect(broken).toEqual([]);
});

test.describe('mobile 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  for (const path of ['/', '/en/']) {
    test(`${path} has no horizontal scroll`, async ({ page }) => {
      await page.goto(path);
      for (const id of ['hero', 'projects', 'lectures', 'contact']) {
        await page.locator(`section#${id}`).scrollIntoViewIfNeeded();
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
