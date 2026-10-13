import { expect, test } from '@playwright/test';
import { MARKER, signInAs } from './session';

test.skip(!process.env.E2E_DATABASE_URL, '회원 시나리오는 DB 가 필요하다');
const DETAIL = '/ai/motion/01-pixel/';

test('guest applies and becomes pending without seeing prompts', async ({ context, page }) => {
  const email = `guest.${Date.now()}@example.com`;
  await signInAs(context, email);
  await page.goto(DETAIL);
  await page.getByTestId('copy-prompt-en').click();
  const dialog = page.getByTestId('signin-dialog');
  await expect(dialog).toContainText('아직 승인신청을 하지 않은 계정입니다.');
  await dialog.getByRole('link', { name: '승인신청하기' }).click();
  await expect(page).toHaveURL(/\/ai\/join\/\?from=/);
  await expect(page.getByTestId('join-email')).toHaveText(email);
  await page.getByLabel('이름').fill('  새교사 ');
  await page.getByLabel('소속').fill('새고등학교');
  await page.getByRole('button', { name: '신청하기' }).click();
  await expect(page.getByRole('status')).toHaveText('신청을 받았습니다. 관리자가 확인하면 사용할 수 있어요.');
  await expect(page.getByTestId('join-state')).toContainText('승인 대기 중');
  await expect(page.getByRole('link', { name: '돌아가기' })).toHaveAttribute('href', DETAIL);
  const html = await (await context.request.get(DETAIL)).text();
  expect(html).not.toContain(MARKER);
  expect((await context.request.get('/ai/motion/admin/', { maxRedirects: 0 })).status()).toBe(404);
});

test('pending member sees the waiting modal and can edit the application', async ({ context, page }) => {
  await signInAs(context, 'pending2@example.com');
  await page.goto(DETAIL);
  await page.getByTestId('copy-prompt-en').click();
  const dialog = page.getByTestId('signin-dialog');
  await expect(dialog).toContainText('승인 대기 중입니다.');
  await expect(dialog).toContainText('대기교사2');
  await page.goto('/ai/join/');
  await page.getByLabel('소속').fill('   ');
  await page.getByRole('button', { name: '신청 내용 저장' }).click();
  await expect(page.getByRole('status')).toHaveText('소속을 입력하세요.');
  await page.reload();
  await expect(page.getByLabel('소속')).toHaveValue('대기중학교2');
});

for (const email of ['viewer@example.com', 'admin@example.com']) {
  test(`${email} is sent straight back from /ai/join/`, async ({ context, page }) => {
    await signInAs(context, email);
    await page.goto(`/ai/join/?from=${encodeURIComponent(DETAIL)}`);
    await expect(page).toHaveURL(new RegExp(`${DETAIL}$`));
    await page.goto('/ai/join/?from=%2F%2Fevil.com');
    await expect(page).toHaveURL(/\/ai\/motion\/$/);
  });
}

test('approved member keeps prompt access', async ({ context, page }) => {
  await signInAs(context, 'viewer@example.com');
  await page.goto(DETAIL);
  await expect(page.getByTestId('copy-prompt-en')).toBeEnabled();
  expect((await context.request.get('/ai/motion/admin/01-pixel/')).status()).toBe(200);
});
