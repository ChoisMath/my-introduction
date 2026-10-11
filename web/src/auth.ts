import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { isAdminEmail } from '@/lib/admin-emails';

// DB 없이 JWT 세션만 쓴다. 허용 목록에 없는 계정은 로그인 자체가 거부된다.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  trustHost: true,
  callbacks: {
    signIn: ({ user, profile }) => profile?.email_verified !== false && isAdminEmail(user.email, process.env.ADMIN_EMAILS),
  },
});
