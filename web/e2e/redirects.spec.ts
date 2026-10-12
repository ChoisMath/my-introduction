import { expect, test } from '@playwright/test';

const CASES: [string, string][] = [
  ['/motion/', '/ai/motion/'],
  ['/motion', '/ai/motion/'],
  ['/motion/01-pixel/', '/ai/motion/01-pixel/'],
  ['/motion/admin/', '/ai/motion/admin/'],
  ['/motion/admin/01-pixel/', '/ai/motion/admin/01-pixel/'],
  ['/motion/admin/viewers/', '/ai/admin/members/'],
  ['/motion/signin-error/?error=AccessDenied', '/ai/signin-error/?error=AccessDenied'],
];

test('old /motion/ links move permanently to /ai/', async ({ request }) => {
  for (const [from, to] of CASES) {
    const r = await request.get(from, { maxRedirects: 0 });
    expect(r.status(), from).toBe(308);
    expect(r.headers().location, from).toBe(to);
  }
});

test('/ai/ opens the first tab', async ({ page }) => {
  await page.goto('/ai/');
  await expect(page).toHaveURL(/\/ai\/motion\/$/);
});
