import type { BrowserContext } from '@playwright/test';
import { encode } from 'next-auth/jwt';

const SECRET = 'e2e-secret-e2e-secret-e2e-secret-00';
const COOKIE = 'authjs.session-token';
export const MARKER = 'E2E-ADMIN-MARKER';

// signIn 콜백을 거치지 않고 세션 쿠키를 직접 만든다(권한 판정은 요청마다 서버가 다시 한다).
export async function signInAs(context: BrowserContext, email: string) {
  const value = await encode({ token: { email, name: email, sub: email }, secret: SECRET, salt: COOKIE });
  await context.addCookies([{ name: COOKIE, value, domain: 'localhost', path: '/' }]);
}
