import { expect, test } from '@playwright/test';
import { MARKER, signInAs } from './session';

const DETAIL = '/ai/motion/01-pixel/';

// 프롬프트는 오빠두엑셀의 허락을 받아 공개(2026-10-19). 로그인 없이 복사되고, 편집기 링크만 회원에게 보인다.
test('anonymous visitor copies prompts without signing in and sees no editor link', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const html = await (await page.request.get(DETAIL)).text();
  expect(html).toContain(MARKER);
  expect(html).not.toContain('{{Channel name=');
  await page.goto(DETAIL);
  await page.getByTestId('copy-prompt-en').click();
  await expect(page.getByTestId('copy-prompt-en')).toHaveText('복사됨');
  const en = await page.evaluate(() => navigator.clipboard.readText());
  expect(en).toContain(MARKER);
  expect(en).not.toContain('{{');
  await expect(page.getByTestId('signin-dialog')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '빈칸 편집·장면표' })).toHaveCount(0);
});

test('nav sign-in dialog offers Google sign-in and join with the current page as from', async ({ page }) => {
  await page.goto(DETAIL);
  await page.getByTestId('hub-signin').click();
  const dialog = page.getByTestId('signin-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Google 계정으로 로그인하세요');
  await expect(dialog).toContainText('AI활용 탭은 누구나 볼 수 있어요.');
  await expect(dialog.getByRole('button')).toHaveText(['Google로 로그인', '승인신청', '닫기']);
  await dialog.getByRole('button', { name: '닫기' }).click();
  await expect(dialog).toBeHidden();
});

test('both Google buttons come back through /ai/join/ with the detail as from', async ({ page }) => {
  await page.route('https://accounts.google.com/**', (route) => route.fulfill({ body: 'google' }));
  for (const testId of ['google-signin', 'join-signin']) {
    await page.goto(DETAIL);
    await page.getByTestId('hub-signin').click();
    await page.getByTestId(testId).click();
    await page.waitForURL(/accounts\.google\.com/);
    const cookies = await page.context().cookies();
    expect(decodeURIComponent(cookies.find((c) => c.name === 'authjs.callback-url')?.value ?? '')).toContain(`/ai/join/?from=${encodeURIComponent(DETAIL)}`);
  }
});

test('signed-in admin copies english and korean prompts and gets the editor link', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await signInAs(context, 'admin@example.com');
  await page.goto(DETAIL);
  await expect(page.getByRole('link', { name: '빈칸 편집·장면표' })).toHaveAttribute('href', '/ai/motion/admin/01-pixel/');
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

test('access denied page explains the unverified email in Korean', async ({ page }) => {
  await page.goto('/ai/signin-error/?error=AccessDenied');
  await expect(page.getByTestId('signin-error-title')).toHaveText('이메일이 확인되지 않은 Google 계정입니다.');
  await expect(page.getByText('문의는 최재혁T에게 해 주세요.')).toBeVisible();
});
