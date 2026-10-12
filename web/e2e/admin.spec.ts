import { expect, test } from '@playwright/test';
import { MARKER, signInAs } from './session';

test('anonymous request is redirected to sign-in without leaking data', async ({ request }) => {
  for (const p of ['/ai/motion/admin/', '/ai/motion/admin/01-pixel/']) {
    const r = await request.get(p, { maxRedirects: 0 });
    expect(r.status()).toBeGreaterThanOrEqual(300);
    expect(r.status()).toBeLessThan(400);
    expect(r.headers().location).toContain('/ai/join/?from=');
    expect(await r.text()).not.toContain(MARKER);
  }
});

test('signed-in non-admin gets 404 without data', async ({ context }) => {
  await signInAs(context, 'other@example.com');
  for (const p of ['/ai/motion/admin/', '/ai/motion/admin/01-pixel/']) {
    const r = await context.request.get(p, { maxRedirects: 0 });
    expect(r.status()).toBe(404);
    expect(await r.text()).not.toContain(MARKER);
  }
});

test('admin sees fixture data and can copy the prompt', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await signInAs(context, 'admin@example.com');
  await page.goto('/ai/motion/admin/01-pixel/');
  await expect(page.getByTestId('prompt-output')).toContainText(MARKER);
  await page.getByTestId('copy-prompt').click();
  await expect(page.getByTestId('copy-prompt')).toHaveText('복사됨');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(MARKER);
});

test.describe('members', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'E2E_DATABASE_URL 이 없으면 DB 가 필요한 회원 시나리오는 건너뛴다');

  test('member sees prompts but not member management', async ({ context, page }) => {
    await signInAs(context, 'viewer@example.com');
    await page.goto('/ai/motion/admin/01-pixel/');
    await expect(page.getByTestId('prompt-output')).toContainText(MARKER);
    await page.goto('/ai/motion/admin/');
    await expect(page.getByTestId('members-link')).toHaveCount(0);
    expect((await context.request.get('/ai/admin/members/', { maxRedirects: 0 })).status()).toBe(404);
  });

  test('admin approves, suspends and deletes; access follows immediately', async ({ browser }) => {
    const admin = await browser.newContext();
    await signInAs(admin, 'admin@example.com');
    const page = await admin.newPage();
    const teacher = await browser.newContext();
    await signInAs(teacher, 'pending@example.com');

    await page.goto('/ai/admin/members/');
    const pending = page.getByTestId('member-row').filter({ hasText: 'pending@example.com' });
    await expect(pending).toHaveAttribute('data-status', 'PENDING');
    expect((await teacher.request.get('/ai/motion/admin/', { maxRedirects: 0 })).status()).toBe(404);

    await pending.getByRole('button', { name: '승인' }).click();
    await page.getByRole('link', { name: /등록/ }).first().click();
    const approved = page.getByTestId('member-row').filter({ hasText: 'pending@example.com' });
    await expect(approved).toHaveAttribute('data-status', 'APPROVED');
    await expect(approved.getByRole('button', { name: '삭제' })).toHaveCount(0);
    expect((await teacher.request.get('/ai/motion/admin/')).status()).toBe(200);

    await approved.getByRole('button', { name: '대기로 변경' }).click();
    expect((await teacher.request.get('/ai/motion/admin/', { maxRedirects: 0 })).status()).toBe(404);

    await page.goto('/ai/admin/members/?s=pending');
    const again = page.getByTestId('member-row').filter({ hasText: 'pending@example.com' });
    await again.getByRole('button', { name: '삭제' }).click();
    await page.getByTestId('confirm-delete').getByRole('button', { name: '삭제' }).click();
    await expect(page.getByTestId('member-row').filter({ hasText: 'pending@example.com' })).toHaveCount(0);
    await admin.close();
    await teacher.close();
  });

  test('admin adds a teacher directly as approved and edits the name', async ({ context, page }) => {
    await signInAs(context, 'admin@example.com');
    await page.goto('/ai/admin/members/?s=all');
    const add = page.getByTestId('member-add');
    await add.getByLabel('이메일').fill('  Direct@Example.com ');
    await add.getByLabel('이름', { exact: true }).fill('직접교사');
    await add.getByLabel('소속', { exact: true }).fill('직접고');
    await add.getByRole('button', { name: '추가' }).click();
    await expect(add.getByRole('status')).toHaveText('등록했습니다: direct@example.com');
    const row = page.getByTestId('member-row').filter({ hasText: 'direct@example.com' });
    await expect(row).toHaveAttribute('data-status', 'APPROVED');
    await row.locator('summary').click();
    await row.getByLabel('이름').fill('고친교사');
    await row.getByRole('button', { name: '저장' }).click();
    await expect(page.getByTestId('member-row').filter({ hasText: 'direct@example.com' })).toContainText('고친교사');
  });

  test('approved member cannot be deleted even with a forged form post', async ({ context, page }) => {
    await signInAs(context, 'admin@example.com');
    await page.goto('/ai/admin/members/?s=approved');
    const row = page.getByTestId('member-row').filter({ hasText: 'viewer@example.com' });
    const id = await row.getAttribute('data-id');
    // 등록 행에는 삭제 폼이 없으므로 pending2 행의 삭제 폼 id 값을 바꿔 보낸다.
    await page.goto('/ai/admin/members/?s=pending');
    const done = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/ai/admin/members'));
    await page.evaluate((target) => {
      const row = [...document.querySelectorAll('[data-testid="member-row"]')].find((r) => r.textContent?.includes('pending2@example.com'));
      const form = row?.querySelector<HTMLFormElement>('form[data-action="delete"]');
      if (!form) throw new Error('no pending2 delete form');
      form.querySelector<HTMLInputElement>('input[name="id"]')!.value = target!;
      form.requestSubmit();
    }, id);
    expect((await done).status()).toBeLessThan(400);
    await page.goto('/ai/admin/members/?s=approved');
    await expect(page.getByTestId('member-row').filter({ hasText: 'viewer@example.com' })).toHaveCount(1);
    await page.goto('/ai/admin/members/?s=pending');
    await expect(page.getByTestId('member-row').filter({ hasText: 'pending2@example.com' })).toHaveCount(1);
  });
});

test('members page shows the redirect error alerts', async ({ context, page }) => {
  await signInAs(context, 'admin@example.com');
  await page.goto('/ai/admin/members/?error=db');
  await expect(page.getByRole('alert').filter({ hasText: 'DB' })).toHaveText('DB 오류로 처리하지 못했습니다. 잠시 후 다시 시도하세요.');
  await page.goto('/ai/admin/members/?error=input');
  await expect(page.getByRole('alert').filter({ hasText: '이름·' })).toHaveText('이름·소속을 확인하세요 (이름 1–30자, 소속 1–50자).');
});
