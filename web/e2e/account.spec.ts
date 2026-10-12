import { expect, test } from '@playwright/test';
import { signInAs } from './session';

test('signed-out home has no account chip', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('account-chip')).toHaveCount(0);
});

// 편집기는 사이트 Nav 를 덮는 전체 화면이라 Nav 칩(가려짐)과 편집기 칩이 DOM 에 둘 다 있다. 편집기 칩이 나중에 나온다.
const chip = (page: import('@playwright/test').Page) => page.getByTestId('account-chip').last();

test('admin sees the chip on home, hub and editor and can sign out', async ({ context, page }) => {
  await signInAs(context, 'admin@example.com');
  for (const p of ['/', '/en/', '/ai/motion/', '/ai/motion/admin/', '/ai/motion/admin/01-pixel/']) {
    await page.goto(p);
    await expect(chip(page), p).toContainText('관리자');
  }
  await chip(page).click();
  const menu = page.getByTestId('account-menu');
  await expect(menu).toContainText('admin@example.com');
  await expect(menu.getByRole('link', { name: /회원 관리/ })).toBeVisible();
  // 편집기 상세는 Esc 로 목록에 돌아가는 단축키가 있다. 메뉴가 열려 있을 땐 메뉴만 닫혀야 한다.
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/\/ai\/motion\/admin\/01-pixel\/$/);
  await chip(page).click();
  await menu.getByRole('button', { name: '로그아웃' }).click();
  await expect(page).toHaveURL(/\/ai\/motion\/$/);
  await expect(page.getByTestId('account-chip')).toHaveCount(0);
  await expect(page.getByTestId('hub-signin')).toBeVisible();
});

test('signing out on a public detail stays on that detail', async ({ context, page }) => {
  await signInAs(context, 'admin@example.com');
  await page.goto('/ai/motion/01-pixel/');
  await page.getByTestId('account-chip').click();
  await page.getByTestId('account-menu').getByRole('button', { name: '로그아웃' }).click();
  await expect(page).toHaveURL(/\/ai\/motion\/01-pixel\/$/);
});

test('member and pending chips show their status and links', async ({ browser }) => {
  test.skip(!process.env.E2E_DATABASE_URL, 'DB 필요');
  for (const [email, badge, link] of [['viewer@example.com', '등록', '모션그래픽 프롬프트'], ['pending@example.com', '승인 대기', '신청 내용 수정']] as const) {
    const ctx = await browser.newContext();
    await signInAs(ctx, email);
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.getByTestId('account-chip')).toContainText(badge);
    await page.getByTestId('account-chip').click();
    await expect(page.getByTestId('account-menu').getByRole('link', { name: link })).toBeVisible();
    await ctx.close();
  }
});

test('signed-in home has no horizontal scroll at 375px', async ({ context, page }) => {
  await signInAs(context, 'admin@example.com');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.getByTestId('account-chip')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('menu link to the join form closes the menu after navigation', async ({ context, page }) => {
  await signInAs(context, 'pending2@example.com');
  await page.goto('/ai/motion/');
  await page.getByTestId('account-chip').click();
  await page.getByTestId('account-menu').getByRole('link', { name: '신청 내용 수정' }).click();
  await expect(page).toHaveURL(/\/ai\/join\/$/);
  await expect(page.getByTestId('account-menu')).toBeHidden();
});
