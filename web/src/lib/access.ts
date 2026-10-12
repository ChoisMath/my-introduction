import 'server-only';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import type { MotionAdmin } from '@me/content';
import { auth } from '@/auth';
import { isAdminEmail } from './admin-emails';
import { joinPath } from './ai-paths';
import { errorTag } from './log';
import { canUsePrompts, normalizeEmail, resolveRole, type MemberLookup, type MemberRole } from './member-role';
import { countPending, lookupMember, type MemberRow } from './members';
import { readMotionAdmin } from './motion-admin';
import { readSlideAdmin } from './slides';
import { volumeRoot } from './volume';

export type MemberSummary = { name: string; affiliation: string; createdAt: string };
export type ViewerState =
  | { status: 'signedOut' }
  | { status: MemberRole; email: string; name: string; image: string | null; member: MemberSummary | null; pendingCount: number };
export type PromptAccess =
  | { status: 'signedOut' | 'guest' | 'pending' | 'unavailable'; member: MemberSummary | null }
  | { status: 'allowed'; data: MotionAdmin | null };
export type SlidePromptAccess =
  | { status: 'signedOut' | 'guest' | 'pending' | 'unavailable'; member: MemberSummary | null }
  | { status: 'allowed'; prompts: Record<string, string> | null };

const summary = (m: MemberRow | null): MemberSummary | null =>
  m ? { name: m.name, affiliation: m.affiliation, createdAt: m.createdAt.toISOString() } : null;

// 매 요청 DB 를 다시 읽으므로 대기로 바꾸면 JWT 세션이 남아 있어도 다음 요청부터 막힌다.
export const getAccess = cache(async (rawEmail: string | null | undefined): Promise<{ role: MemberRole; member: MemberRow | null }> => {
  const email = normalizeEmail(rawEmail);
  if (!email) return { role: 'unavailable', member: null };
  if (isAdminEmail(email, process.env.ADMIN_EMAILS)) return { role: 'admin', member: null };
  let member: MemberRow | null = null;
  let lookup: MemberLookup;
  try {
    member = await lookupMember(email);
    lookup = member ? { status: member.status } : null;
  } catch (error) {
    console.error('[members] lookup failed', errorTag(error));
    lookup = 'error';
  }
  return { role: resolveRole(false, lookup), member };
});

// layout 만 믿지 않고 회원 데이터를 읽는 모든 경로·액션에서 다시 확인한다.
export async function requireMember(path: string): Promise<{ role: 'admin' | 'member'; email: string }> {
  const session = await auth();
  if (!session?.user?.email) redirect(joinPath(path));
  const { role } = await getAccess(session.user.email);
  if (!canUsePrompts(role)) notFound();
  return { role, email: normalizeEmail(session.user.email) ?? '' };
}

export async function requireAdmin(path: string): Promise<string> {
  const { role, email } = await requireMember(path);
  if (role !== 'admin') notFound();
  return email;
}

// 공개 상세용: 리다이렉트하지 않고 상태만 돌려준다. 권한이 있을 때만 Volume 의 프롬프트를 읽는다.
export async function getPromptAccess(id: string): Promise<PromptAccess> {
  const session = await auth();
  if (!session?.user?.email) return { status: 'signedOut', member: null };
  const { role, member } = await getAccess(session.user.email);
  if (!canUsePrompts(role)) return { status: role, member: summary(member) };
  const list = await readMotionAdmin(volumeRoot());
  return { status: 'allowed', data: list?.find((a) => a.id === id) ?? null };
}

// 슬라이드는 한 페이지 안의 상세 창이라 공개 상세 라우트가 없다. 목록 요청에서 한 번 판정해 권한이 있을 때만 프롬프트를 싣는다.
export async function getSlidePromptAccess(): Promise<SlidePromptAccess> {
  const session = await auth();
  if (!session?.user?.email) return { status: 'signedOut', member: null };
  const { role, member } = await getAccess(session.user.email);
  if (!canUsePrompts(role)) return { status: role, member: summary(member) };
  const list = await readSlideAdmin(volumeRoot());
  return { status: 'allowed', prompts: list ? Object.fromEntries(list.map((a) => [a.id, a.prompt])) : null };
}

export async function loadMotionAdmin(path: string): Promise<{ role: 'admin' | 'member'; list: MotionAdmin[] | null }> {
  const { role } = await requireMember(path);
  return { role, list: await readMotionAdmin(volumeRoot()) };
}

export const getViewerState = cache(async (): Promise<ViewerState> => {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!session?.user || !email) return { status: 'signedOut' };
  const { role, member } = await getAccess(email);
  let pendingCount = 0;
  if (role === 'admin') {
    try {
      pendingCount = await countPending();
    } catch (error) {
      console.error('[members] count failed', errorTag(error));
    }
  }
  return { status: role, email, name: member?.name ?? session.user.name ?? email, image: session.user.image ?? null, member: summary(member), pendingCount };
});
