import { expect, test } from '@playwright/test';
import { MARKER, signInAs } from './session';

const DETAIL = '/ai/motion/01-pixel/';

test('anonymous visitor gets the Google-only sign-in modal and no prompt data', async ({ page }) => {
  const html = await (await page.request.get(DETAIL)).text();
  expect(html).not.toContain(MARKER);
  await page.goto(DETAIL);
  await page.getByTestId('copy-prompt-en').click();
  const dialog = page.getByTestId('signin-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('로그인하여 프롬프트를 복사하세요.');
  await expect(dialog).toContainText('로그인을 위한 아이디 등록은 최재혁T에게 문의하세요.');
  await expect(dialog.getByRole('button')).toHaveText(['Google로 로그인', '닫기']);
  await dialog.getByRole('button', { name: '닫기' }).click();
  await expect(dialog).toBeHidden();
});

test('Google button goes straight to Google and returns to the same detail page', async ({ page }) => {
  await page.route('https://accounts.google.com/**', (route) => route.fulfill({ body: 'google' }));
  await page.goto(DETAIL);
  await page.getByTestId('copy-prompt-ko').click();
  await page.getByTestId('google-signin').click();
  await page.waitForURL(/accounts\.google\.com/);
  const url = new URL(page.url());
  expect(url.searchParams.get('redirect_uri')).toContain('/api/auth/callback/google');
  const cookies = await page.context().cookies();
  expect(decodeURIComponent(cookies.find((c) => c.name === 'authjs.callback-url')?.value ?? '')).toContain('/ai/join/?from=' + encodeURIComponent(DETAIL));
});

test('signed-in admin copies english and korean prompts', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await signInAs(context, 'admin@example.com');
  await page.goto(DETAIL);
  await page.getByTestId('copy-prompt-en').click();
  await expect(page.getByTestId('copy-prompt-en')).toHaveText('복사됨');
  const en = await page.evaluate(() => navigator.clipboard.readText());
  expect(en).toContain(MARKER);
  expect(en).toContain('Chois의 바이브코딩');
  expect(en).not.toContain('{{');
  await page.getByTestId('copy-prompt-ko').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('## 1. 채널');
  await expect(page.getByTestId('signin-dialog')).toHaveCount(0);
});

test('signed-in unregistered account sees the not-registered modal', async ({ context, page }) => {
  await signInAs(context, 'other@example.com');
  const html = await (await context.request.get(DETAIL)).text();
  expect(html).not.toContain(MARKER);
  await page.goto(DETAIL);
  await page.getByTestId('copy-prompt-en').click();
  await expect(page.getByTestId('signin-dialog')).toContainText('등록되지 않은 계정입니다.');
  await expect(page.getByTestId('google-signin')).toHaveText('다른 Google 계정으로 로그인');
});

test('access denied page explains registration in Korean', async ({ page }) => {
  await page.goto('/ai/signin-error/?error=AccessDenied');
  await expect(page.getByTestId('signin-error-title')).toHaveText('등록되지 않은 Google 계정입니다.');
  await expect(page.getByText('로그인을 위한 아이디 등록은 최재혁T에게 문의하세요.')).toBeVisible();
});
