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
