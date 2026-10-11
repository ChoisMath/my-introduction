import 'server-only';
import { notFound, redirect } from 'next/navigation';
import type { MotionAdmin } from '@me/content';
import { auth } from '@/auth';
import { isAdminEmail } from './admin-emails';
import { readMotionAdmin } from './motion-admin';
import { volumeRoot } from './volume';

// layout 만 믿지 않고 관리자 데이터를 읽는 모든 경로에서 다시 확인한다.
export async function requireAdmin(callbackPath: string): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  if (!isAdminEmail(session.user.email, process.env.ADMIN_EMAILS)) notFound();
}

export async function loadMotionAdmin(callbackPath: string): Promise<MotionAdmin[] | null> {
  await requireAdmin(callbackPath);
  return readMotionAdmin(volumeRoot());
}
