import type { MotionPublic } from '@me/content';

export type AdminListItem = Pick<MotionPublic, 'id' | 'no' | 'group' | 'name' | 'en' | 'use' | 'concept'> & {
  poster: string | null;
  preview: string | null;
};

export function matchesQuery(m: Pick<MotionPublic, 'no' | 'name' | 'en' | 'use' | 'concept' | 'group'>, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [String(m.no).padStart(2, '0'), m.name, m.en, m.use, m.concept, m.group].join(' ').toLowerCase().includes(q);
}

// 목록에서 고른 필터 순서대로 이전/다음을 잇는다. 필터에 없는 id 로 들어오면 전체 순서를 쓴다.
export function adminOrder<T extends MotionPublic>(list: T[], id: string, group: string | undefined, query: string | undefined): T[] {
  const filtered = list.filter((m) => (!group || m.group === group) && matchesQuery(m, query ?? ''));
  return filtered.some((m) => m.id === id) ? filtered : list;
}
