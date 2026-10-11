import { expect, test, type BrowserContext } from '@playwright/test';
import { encode } from 'next-auth/jwt';

const SECRET = 'e2e-secret-e2e-secret-e2e-secret-00';
const COOKIE = 'authjs.session-token';
const MARKER = 'E2E-ADMIN-MARKER';

async function signInAs(context: BrowserContext, email: string) {
  const value = await encode({ token: { email, name: email, sub: email }, secret: SECRET, salt: COOKIE });
  await context.addCookies([{ name: COOKIE, value, domain: 'localhost', path: '/' }]);
}

test('anonymous request is redirected to sign-in without leaking data', async ({ request }) => {
  for (const p of ['/motion/admin/', '/motion/admin/01-pixel/']) {
    const r = await request.get(p, { maxRedirects: 0 });
    expect(r.status()).toBeGreaterThanOrEqual(300);
    expect(r.status()).toBeLessThan(400);
    expect(r.headers().location).toContain('/api/auth/signin');
    expect(await r.text()).not.toContain(MARKER);
  }
});

test('signed-in non-admin gets 404 without data', async ({ context }) => {
  await signInAs(context, 'other@example.com');
  for (const p of ['/motion/admin/', '/motion/admin/01-pixel/']) {
    const r = await context.request.get(p, { maxRedirects: 0 });
    expect(r.status()).toBe(404);
    expect(await r.text()).not.toContain(MARKER);
  }
});

test('admin sees fixture data and can copy the prompt', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await signInAs(context, 'admin@example.com');
  await page.goto('/motion/admin/01-pixel/');
  await expect(page.getByTestId('prompt-output')).toContainText(MARKER);
  await page.getByTestId('copy-prompt').click();
  await expect(page.getByTestId('copy-prompt')).toHaveText('복사됨');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(MARKER);
});
