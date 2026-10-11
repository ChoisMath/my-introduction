import { expect, test } from '@playwright/test';

test('home shows the motion section with rendered cards only', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('section#motion');
  await expect(section.getByTestId('motion-card')).toHaveCount(2);
  await expect(section.getByRole('link', { name: /전체 보기/ })).toHaveAttribute('href', '/motion/');
  await expect(page.getByRole('navigation', { name: 'primary' }).getByRole('link', { name: '모션' })).toHaveAttribute('href', '/#motion');
});

test('english home links english names to the korean gallery', async ({ page }) => {
  await page.goto('/en/');
  await expect(page.locator('section#motion').getByTestId('motion-card')).toHaveCount(2);
});

test('gallery filters by group and keeps it in the url', async ({ page }) => {
  await page.goto('/motion/');
  await expect(page.getByTestId('motion-card')).toHaveCount(2);
  await page.getByRole('button', { name: /종이·공예/ }).click();
  await expect(page.getByTestId('motion-card')).toHaveCount(1);
  await expect(page).toHaveURL(/\?g=/);
  await page.reload();
  await expect(page.getByTestId('motion-card')).toHaveCount(1);
  await page.getByTestId('motion-card').click();
  await expect(page).toHaveURL(/\/motion\/\d{2}-/);
  await page.goBack();
  await expect(page.getByTestId('motion-card')).toHaveCount(1);
  await page.getByRole('button', { name: /^전체/ }).click();
  await expect(page.getByTestId('motion-card')).toHaveCount(2);
});

test('detail page plays the versioned video and moves with arrow keys', async ({ page, request }) => {
  await page.goto('/motion/01-pixel/');
  const video = page.locator('video[data-testid="motion-video"]');
  const src = await video.getAttribute('src');
  expect(src).toMatch(/^\/media\/motion\/01-pixel\/video\.mp4\?v=[0-9a-f]{8}$/);
  const r = await request.get(src!, { headers: { range: 'bytes=0-99' } });
  expect(r.status()).toBe(206);
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/\/motion\/17-embroidery\/$/);
});

test('unrendered and unknown ids are 404', async ({ request }) => {
  expect((await request.get('/motion/02-comics/')).status()).toBe(404);
  expect((await request.get('/motion/zz-nope/')).status()).toBe(404);
});

test.describe('mobile 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test('gallery has no horizontal page scroll', async ({ page }) => {
    await page.goto('/motion/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
  for (const p of ['/motion/01-pixel/', '/#motion']) {
    test(`${p} has no horizontal page scroll`, async ({ page }) => {
      await page.goto(p);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test('admin pages require sign-in', async ({ page }) => {
  for (const p of ['/motion/admin/', '/motion/admin/01-pixel/']) {
    await page.goto(p);
    await expect(page).toHaveURL(/\/api\/auth\/signin/);
  }
});

test('auth endpoints answer without a trailing-slash redirect', async ({ request }) => {
  const r = await request.get('/api/auth/providers', { maxRedirects: 0 });
  expect(r.status()).toBe(200);
  expect(Object.keys(await r.json())).toContain('google');
});
