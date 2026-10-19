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
import { volumeRoot } from './volume';

export type MemberSummary = { name: string; affiliation: string; createdAt: string };
export type ViewerState =
  | { status: 'signedOut' }
  | { status: MemberRole; email: string; name: string; image: string | null; member: MemberSummary | null; pendingCount: number };

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

// AI활용 탭(모션·슬라이드 프롬프트, 브랜드 룩북)은 오빠두엑셀의 허락을 받아 누구에게나 공개한다(2026-10-19).
// 회원 판정은 편집기(/ai/motion/admin/)·회원 관리 같은 회원 기능과, 앞으로 제한이 필요한 페이지에만 쓴다.
export const isMember = (state: ViewerState): boolean => state.status === 'admin' || state.status === 'member';

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
