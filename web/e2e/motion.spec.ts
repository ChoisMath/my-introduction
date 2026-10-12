import { expect, test } from '@playwright/test';

test('home has no AI활용 section; nav (last item) and contact link to the hub', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('section#ai')).toHaveCount(0);
  await expect(page.getByTestId('motion-card')).toHaveCount(0);
  const navLinks = page.getByRole('navigation', { name: 'primary' }).getByRole('listitem');
  await expect(navLinks.last().getByRole('link')).toHaveText('AI활용');
  await expect(navLinks.last().getByRole('link')).toHaveAttribute('href', '/ai/');
  await expect(page.locator('section#contact').getByRole('link', { name: /AI활용/ })).toHaveAttribute('href', '/ai/');
  await navLinks.last().getByRole('link').click();
  await expect(page).toHaveURL(/\/ai\/motion\/$/);
});

test('old #ai and #motion anchors on the home page move to the hub', async ({ page }) => {
  for (const p of ['/#ai', '/#motion', '/en/#ai']) {
    await page.goto(p);
    await expect(page).toHaveURL(/\/ai\/motion\/$/);
  }
});

test('footer is pinned to the bottom with a page-specific text', async ({ page }) => {
  for (const [p, text] of [
    ['/', '© 최재혁, 대구광역시교육청 수학교사'],
    ['/en/', '© Jae-hyuk Choi, Math Teacher, Daegu Metropolitan Office of Education'],
    ['/ai/motion/', '© 이 페이지는 oppadu.com/ai를 가공한 2차 저작물입니다.'],
    ['/ai/slide/', '© 이 페이지는 oppadu.com/ai를 가공한 2차 저작물입니다.'],
  ] as const) {
    await page.goto(p);
    const footer = page.getByTestId('site-footer');
    await expect(footer).toHaveCount(1);
    await expect(footer).toHaveText(text);
    await expect(footer).toHaveCSS('position', 'fixed');
    const box = await footer.boundingBox();
    expect(Math.round(box!.y + box!.height)).toBe(page.viewportSize()!.height);
  }
  await expect(page.getByTestId('site-footer').getByRole('link', { name: 'oppadu.com/ai' })).toHaveAttribute('href', 'https://oppadu.com/ai');
});

test('gallery filters by group and keeps it in the url', async ({ page }) => {
  await page.goto('/ai/motion/');
  await expect(page.getByTestId('motion-card')).toHaveCount(2);
  await page.getByRole('button', { name: /종이·공예/ }).click();
  await expect(page.getByTestId('motion-card')).toHaveCount(1);
  await expect(page).toHaveURL(/\?g=/);
  await page.reload();
  await expect(page.getByTestId('motion-card')).toHaveCount(1);
  await page.getByTestId('motion-card').click();
  await expect(page).toHaveURL(/\/ai\/motion\/\d{2}-/);
  await page.goBack();
  await expect(page.getByTestId('motion-card')).toHaveCount(1);
  await page.getByRole('button', { name: /^전체/ }).click();
  await expect(page.getByTestId('motion-card')).toHaveCount(2);
});

test('detail page plays the versioned video and moves with arrow keys', async ({ page, request }) => {
  await page.goto('/ai/motion/01-pixel/');
  const video = page.locator('video[data-testid="motion-video"]');
  const src = await video.getAttribute('src');
  expect(src).toMatch(/^\/media\/motion\/01-pixel\/video\.mp4\?v=[0-9a-f]{8}$/);
  const r = await request.get(src!, { headers: { range: 'bytes=0-99' } });
  expect(r.status()).toBe(206);
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/\/ai\/motion\/17-embroidery\/$/);
});

test('unrendered and unknown ids are 404', async ({ request }) => {
  expect((await request.get('/ai/motion/02-comics/')).status()).toBe(404);
  expect((await request.get('/ai/motion/zz-nope/')).status()).toBe(404);
});

test.describe('mobile 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test('gallery has no horizontal page scroll', async ({ page }) => {
    await page.goto('/ai/motion/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
  for (const p of ['/ai/motion/01-pixel/', '/ai/slide/']) {
    test(`${p} has no horizontal page scroll`, async ({ page }) => {
      await page.goto(p);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test('admin pages require sign-in', async ({ page }) => {
  for (const p of ['/ai/motion/admin/', '/ai/motion/admin/01-pixel/']) {
    await page.goto(p);
    await expect(page).toHaveURL(/\/ai\/join\/\?from=/);
  }
});

test('auth endpoints answer without a trailing-slash redirect', async ({ request }) => {
  const r = await request.get('/api/auth/providers', { maxRedirects: 0 });
  expect(r.status()).toBe(200);
  expect(Object.keys(await r.json())).toContain('google');
});
