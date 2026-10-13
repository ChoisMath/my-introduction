import { expect, test } from '@playwright/test';
import { signInAs } from './session';

test('hub header and tab show on gallery and detail', async ({ page }) => {
  for (const p of ['/ai/motion/', '/ai/motion/01-pixel/']) {
    await page.goto(p);
    const header = page.getByTestId('ai-header');
    await expect(header.getByRole('heading', { level: 1 })).toHaveText('AI활용');
    const tab = header.getByRole('link', { name: '모션그래픽' });
    await expect(tab).toHaveAttribute('aria-current', 'page');
    await expect(header.getByTestId('hub-signin')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'primary' }).getByTestId('hub-signin')).toHaveText('로그인 · 승인신청');
  }
});

test('admin sees members badge only when someone is waiting', async ({ context, page }) => {
  test.skip(!process.env.E2E_DATABASE_URL, 'DB 필요');
  await signInAs(context, 'admin@example.com');
  await page.goto('/ai/motion/');
  await expect(page.getByTestId('members-badge')).toHaveText(/회원 관리\s*\d+/);
  await expect(page.getByTestId('hub-signin')).toHaveCount(0);
});

test('full-screen editor does not show the hub header', async ({ context, page }) => {
  await signInAs(context, 'admin@example.com');
  await page.goto('/ai/motion/admin/');
  await expect(page.getByTestId('ai-header')).toHaveCount(0);
});
