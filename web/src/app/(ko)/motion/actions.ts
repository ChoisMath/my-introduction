'use server';
import { signIn } from '@/auth';

// 로그인 후 돌아갈 곳은 모션 경로로만 제한한다(열린 리다이렉트 방지).
const RETURN_PATH = /^\/motion\/(?:[a-z0-9-]+\/)?$/;

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const to = String(formData.get('redirectTo') ?? '');
  await signIn('google', { redirectTo: RETURN_PATH.test(to) ? to : '/motion/' });
}
