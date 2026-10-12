import { expect, test } from '@playwright/test';
import { MARKER, signInAs } from './session';

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

test.describe('registered viewers', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'E2E_DATABASE_URL 이 없으면 DB 가 필요한 열람자 시나리오는 건너뛴다');

  test('viewer sees prompts but not viewer management', async ({ context, page }) => {
    await signInAs(context, 'viewer@example.com');
    await page.goto('/motion/admin/01-pixel/');
    await expect(page.getByTestId('prompt-output')).toContainText(MARKER);
    await page.goto('/motion/admin/');
    await expect(page.getByTestId('admin-row').first()).toBeVisible();
    await expect(page.getByTestId('viewers-link')).toHaveCount(0);
    const r = await context.request.get('/motion/admin/viewers/', { maxRedirects: 0 });
    expect(r.status()).toBe(404);
  });

  test('admin adds and removes a viewer and access follows immediately', async ({ browser }) => {
    const email = 'new.student@example.com';
    const admin = await browser.newContext();
    await signInAs(admin, 'admin@example.com');
    const page = await admin.newPage();
    await page.goto('/motion/admin/');
    await page.getByTestId('viewers-link').click();
    await expect(page.getByTestId('viewer-row')).toHaveCount(1);

    await page.getByLabel('이메일').fill('  New.Student@Example.com ');
    await page.getByLabel('메모').fill('2학년');
    await page.getByRole('button', { name: '추가' }).click();
    await expect(page.getByRole('status')).toHaveText(`등록했습니다: ${email}`);
    await expect(page.getByTestId('viewer-row').filter({ hasText: email })).toHaveCount(1);

    await page.getByLabel('이메일').fill(email);
    await page.getByRole('button', { name: '추가' }).click();
    await expect(page.getByRole('status')).toContainText('이미 등록된 이메일');
    await expect(page.getByLabel('이메일')).toHaveValue(email);

    const student = await browser.newContext();
    await signInAs(student, email);
    expect((await student.request.get('/motion/admin/01-pixel/', { maxRedirects: 0 })).status()).toBe(200);

    await page.getByRole('button', { name: `${email} 삭제` }).click();
    await expect(page.getByTestId('viewer-row').filter({ hasText: email })).toHaveCount(0);
    expect((await student.request.get('/motion/admin/01-pixel/', { maxRedirects: 0 })).status()).toBe(404);
    await Promise.all([admin.close(), student.close()]);
  });
});
