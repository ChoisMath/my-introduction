import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { AI_SIGNIN_ERROR } from '@/lib/ai-paths';

// 세션은 JWT 만 쓴다. 이메일이 확인된 Google 계정은 모두 로그인할 수 있어야 가입 신청을 받을 수 있다.
// 권한은 로그인이 아니라 요청마다 lib/access 가 회원 상태로 판정한다.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  trustHost: true,
  pages: { error: AI_SIGNIN_ERROR },
  callbacks: {
    signIn: ({ profile }) => profile?.email_verified !== false,
  },
});
