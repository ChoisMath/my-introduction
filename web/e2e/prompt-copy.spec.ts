import { expect, test } from '@playwright/test';
import { MARKER, signInAs } from './session';

const DETAIL = '/ai/motion/01-pixel/';

test('anonymous visitor gets the sign-in modal with a join button and no prompt data', async ({ page }) => {
  const html = await (await page.request.get(DETAIL)).text();
  expect(html).not.toContain(MARKER);
  await page.goto(DETAIL);
  await page.getByTestId('copy-prompt-en').click();
  const dialog = page.getByTestId('signin-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('로그인 하여 AI활용 방법을 알아보세요');
  await expect(dialog).toContainText('승인된 교사만 프롬프트를 쓸 수 있어요.');
  await expect(dialog.getByRole('button')).toHaveText(['Google로 로그인', '승인신청', '닫기']);
  await dialog.getByRole('button', { name: '닫기' }).click();
  await expect(dialog).toBeHidden();
});

test('both Google buttons come back through /ai/join/ with the detail as from', async ({ page }) => {
  await page.route('https://accounts.google.com/**', (route) => route.fulfill({ body: 'google' }));
  for (const testId of ['google-signin', 'join-signin']) {
    await page.goto(DETAIL);
    await page.getByTestId('copy-prompt-ko').click();
    await page.getByTestId(testId).click();
    await page.waitForURL(/accounts\.google\.com/);
    const cookies = await page.context().cookies();
    expect(decodeURIComponent(cookies.find((c) => c.name === 'authjs.callback-url')?.value ?? '')).toContain(`/ai/join/?from=${encodeURIComponent(DETAIL)}`);
  }
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

test('access denied page explains the unverified email in Korean', async ({ page }) => {
  await page.goto('/ai/signin-error/?error=AccessDenied');
  await expect(page.getByTestId('signin-error-title')).toHaveText('이메일이 확인되지 않은 Google 계정입니다.');
  await expect(page.getByText('문의는 최재혁T에게 해 주세요.')).toBeVisible();
});
