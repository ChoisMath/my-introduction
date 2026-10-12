import 'server-only';
import { cache } from 'react';
import { isAdminEmail } from './admin-emails';

export type MotionRole = 'admin' | 'viewer';
export type Viewer = { id: number; email: string; note: string | null; addedBy: string; createdAt: Date };

// Prisma 는 필요할 때만 불러온다. 모듈 로드 실패나 DB 장애가 관리자(환경변수 판정) 로그인까지 막지 않게.
async function db() {
  return (await import('./prisma')).prisma;
}

export const getMotionRole = cache(async (email: string | null | undefined): Promise<MotionRole | null> => {
  if (isAdminEmail(email, process.env.ADMIN_EMAILS)) return 'admin';
  const target = email?.trim().toLowerCase();
  if (!target) return null;
  try {
    const row = await (await db()).motionViewer.findUnique({ where: { email: target }, select: { id: true } });
    return row ? 'viewer' : null;
  } catch (error) {
    console.error('[motion-viewers] viewer lookup failed', error);
    return null;
  }
});

export async function listViewers(): Promise<Viewer[]> {
  return (await db()).motionViewer.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function addViewer(data: { email: string; note: string | null; addedBy: string }): Promise<'added' | 'duplicate'> {
  try {
    await (await db()).motionViewer.create({ data });
    return 'added';
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') return 'duplicate';
    throw error;
  }
}

// 두 탭에서 같은 행을 지워도 오류가 나지 않게 deleteMany 를 쓴다.
export async function removeViewer(id: number): Promise<void> {
  await (await db()).motionViewer.deleteMany({ where: { id } });
}
