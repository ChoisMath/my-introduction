export type MemberRole = 'admin' | 'member' | 'pending' | 'guest' | 'unavailable';
export type MemberStatus = 'PENDING' | 'APPROVED';
export type MemberLookup = { status: MemberStatus } | null | 'error';

// 관리자는 env 판정이 먼저라 DB 장애·예전 회원 행과 무관하게 항상 관리자다.
export function resolveRole(isAdmin: boolean, lookup: MemberLookup): MemberRole {
  if (isAdmin) return 'admin';
  if (lookup === 'error') return 'unavailable';
  if (lookup === null) return 'guest';
  return lookup.status === 'APPROVED' ? 'member' : 'pending';
}

export function canUsePrompts(role: MemberRole): role is 'admin' | 'member' {
  return role === 'admin' || role === 'member';
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  const email = raw?.trim().toLowerCase();
  return email ? email : null;
}
