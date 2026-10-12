'use server';
import { signIn, signOut } from '@/auth';
import { joinPath, signOutReturnPath } from '@/lib/ai-paths';

// 어느 버튼으로 로그인하든 /ai/join/ 이 역할에 따라 원래 화면·신청 폼·대기 안내로 갈라 준다.
export async function signInWithGoogle(formData: FormData): Promise<void> {
  await signIn('google', { redirectTo: joinPath(formData.get('from')) });
}

export async function signOutAction(formData: FormData): Promise<void> {
  await signOut({ redirectTo: signOutReturnPath(formData.get('from')) });
}
