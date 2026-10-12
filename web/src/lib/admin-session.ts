import 'server-only';
import { notFound, redirect } from 'next/navigation';
import type { MotionAdmin } from '@me/content';
import { auth } from '@/auth';
import { readMotionAdmin } from './motion-admin';
import { getMotionRole, type MotionRole } from './motion-viewers';
import { volumeRoot } from './volume';

// layout 만 믿지 않고 관리자 데이터를 읽는 모든 경로에서 다시 확인한다. 열람자 삭제도 다음 요청부터 바로 반영된다.
async function requireRole(callbackPath: string): Promise<{ role: MotionRole; email: string }> {
  const session = await auth();
  if (!session?.user) redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  const role = await getMotionRole(session.user.email);
  if (!role) notFound();
  return { role, email: session.user.email ?? '' };
}

export async function requireViewer(callbackPath: string): Promise<MotionRole> {
  return (await requireRole(callbackPath)).role;
}

/** 관리자 이메일을 돌려준다. */
export async function requireAdmin(callbackPath: string): Promise<string> {
  const { role, email } = await requireRole(callbackPath);
  if (role !== 'admin') notFound();
  return email;
}

export type PromptAccess = { status: 'signedOut' | 'denied' } | { status: 'allowed'; data: MotionAdmin | null };

// 공개 상세 페이지용: 리다이렉트하지 않고 상태만 돌려준다. 권한이 있을 때만 프롬프트를 읽는다.
export async function getPromptAccess(id: string): Promise<PromptAccess> {
  const session = await auth();
  if (!session?.user) return { status: 'signedOut' };
  if (!(await getMotionRole(session.user.email))) return { status: 'denied' };
  const list = await readMotionAdmin(volumeRoot());
  return { status: 'allowed', data: list?.find((a) => a.id === id) ?? null };
}

export async function loadMotionAdmin(callbackPath: string): Promise<{ role: MotionRole; list: MotionAdmin[] | null }> {
  const role = await requireViewer(callbackPath);
  return { role, list: await readMotionAdmin(volumeRoot()) };
}
