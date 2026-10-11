import { expect, test } from '@playwright/test';

test('health reports a writable volume', async ({ request }) => {
  const r = await request.get('/api/health', { maxRedirects: 0 });
  expect(r.status()).toBe(200);
  expect(await r.json()).toEqual({ ok: true });
});

test('existing locale urls still work', async ({ request }) => {
  for (const p of ['/', '/en/', '/en']) expect((await request.get(p, { maxRedirects: 0 })).status(), p).toBe(200);
});

test('api routes answer without a trailing-slash redirect', async ({ request }) => {
  for (const p of ['/api/health', '/api/health/']) expect((await request.get(p, { maxRedirects: 0 })).status(), p).toBe(200);
});
