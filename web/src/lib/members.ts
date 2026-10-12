import 'server-only';
import type { MemberStatus } from './member-role';

export type MemberRow = {
  id: number;
  email: string;
  name: string;
  affiliation: string;
  status: MemberStatus;
  createdAt: Date;
  decidedBy: string | null;
  decidedAt: Date | null;
};

// Prisma 는 필요할 때만 불러온다. 모듈 로드 실패나 DB 장애가 관리자(환경변수 판정) 화면까지 막지 않게.
async function db() {
  return (await import('./prisma')).prisma;
}

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';

export async function lookupMember(email: string): Promise<MemberRow | null> {
  return (await db()).member.findUnique({ where: { email } });
}

export async function listMembers(): Promise<MemberRow[]> {
  return (await db()).member.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] });
}

export async function countPending(): Promise<number> {
  return (await db()).member.count({ where: { status: 'PENDING' } });
}

// 한 계정 = 한 행. 대기 중 재제출은 이름·소속만 고치고, 등록된 계정은 건드리지 않는다.
export async function applyMember(input: { email: string; name: string; affiliation: string }): Promise<'created' | 'updated' | 'exists'> {
  const client = await db();
  const existing = await client.member.findUnique({ where: { email: input.email }, select: { status: true } });
  if (existing?.status === 'APPROVED') return 'exists';
  if (existing) {
    await client.member.updateMany({ where: { email: input.email, status: 'PENDING' }, data: { name: input.name, affiliation: input.affiliation } });
    return 'updated';
  }
  try {
    await client.member.create({ data: { ...input, status: 'PENDING' } });
    return 'created';
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // 같은 계정이 거의 동시에 두 번 제출한 경우.
    return applyMember(input);
  }
}

export async function setMemberStatus(id: number, to: MemberStatus, by: string): Promise<boolean> {
  const from: MemberStatus = to === 'APPROVED' ? 'PENDING' : 'APPROVED';
  const { count } = await (await db()).member.updateMany({ where: { id, status: from }, data: { status: to, decidedBy: by, decidedAt: new Date() } });
  return count > 0;
}

// 등록 회원은 화면이 아니라 이 조건으로도 지울 수 없다.
export async function deletePendingMember(id: number): Promise<boolean> {
  const { count } = await (await db()).member.deleteMany({ where: { id, status: 'PENDING' } });
  return count > 0;
}

export async function updateMemberProfile(id: number, input: { name: string; affiliation: string }): Promise<boolean> {
  const { count } = await (await db()).member.updateMany({ where: { id }, data: input });
  return count > 0;
}

export async function addApprovedMember(input: { email: string; name: string; affiliation: string; by: string }): Promise<{ result: 'added' } | { result: 'duplicate'; status: MemberStatus }> {
  const client = await db();
  try {
    await client.member.create({ data: { email: input.email, name: input.name, affiliation: input.affiliation, status: 'APPROVED', decidedBy: input.by, decidedAt: new Date() } });
    return { result: 'added' };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const row = await client.member.findUnique({ where: { email: input.email }, select: { status: true } });
    return { result: 'duplicate', status: row?.status ?? 'PENDING' };
  }
}
