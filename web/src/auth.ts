import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { getMotionRole } from '@/lib/motion-viewers';

// 세션은 JWT 만 쓴다. 관리자(ADMIN_EMAILS)나 DB 에 등록된 열람자가 아니면 로그인 자체가 거부된다.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  trustHost: true,
  // 미등록 계정의 AccessDenied 를 Auth.js 기본(영문) 화면 대신 한국어 안내로 보여 준다.
  pages: { error: '/motion/signin-error/' },
  callbacks: {
    signIn: async ({ user, profile }) => profile?.email_verified !== false && (await getMotionRole(user.email)) !== null,
  },
});
