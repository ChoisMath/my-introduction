import type { SlideFamily } from '@me/content';

export type SortKey = 'pop' | 'no' | 'new';
export type ViewKey = 'cover' | 'body';
export type GalleryQuery = { family: SlideFamily | null; sort: SortKey; view: ViewKey };
export type Orderable = { id: string; no: number; family: SlideFamily; added: string };
export type ViewerPos = { style: number; slide: number };

const SORTS: readonly string[] = ['pop', 'no', 'new'];

export function parseQuery(params: URLSearchParams, present: readonly string[]): GalleryQuery {
  const f = params.get('f');
  const s = params.get('s') ?? '';
  return {
    family: f && present.includes(f) ? (f as SlideFamily) : null,
    sort: SORTS.includes(s) ? (s as SortKey) : 'pop',
    view: params.get('v') === 'body' ? 'body' : 'cover',
  };
}

export function toSearch(q: GalleryQuery): string {
  const p = new URLSearchParams();
  if (q.family) p.set('f', q.family);
  if (q.sort !== 'pop') p.set('s', q.sort);
  if (q.view !== 'cover') p.set('v', q.view);
  const s = p.toString();
  return s ? `?${s}` : '';
}

// pop 은 원천 배열 순서 그대로다. 같은 날 올린 스타일은 번호가 큰 쪽을 최신으로 본다.
export function arrange<T extends Orderable>(items: readonly T[], q: GalleryQuery): T[] {
  const shown = q.family ? items.filter((i) => i.family === q.family) : [...items];
  if (q.sort === 'no') shown.sort((a, b) => a.no - b.no);
  if (q.sort === 'new') shown.sort((a, b) => b.added.localeCompare(a.added) || b.no - a.no);
  return shown;
}

// #번호로 연 스타일이 지금 거르기에 없으면 거르기를 무시한 순서로 넘긴다.
export function pickOrder<T extends Orderable>(items: readonly T[], q: GalleryQuery, id: string): T[] {
  const shown = arrange(items, q);
  return shown.some((i) => i.id === id) ? shown : arrange(items, { ...q, family: null });
}

export function stepSlide(pos: ViewerPos, dir: 1 | -1, counts: readonly number[]): ViewerPos {
  const next = pos.slide + dir;
  if (next >= 0 && next < (counts[pos.style] ?? 1)) return { style: pos.style, slide: next };
  const style = (pos.style + dir + counts.length) % counts.length;
  return { style, slide: dir === 1 ? 0 : (counts[style] ?? 1) - 1 };
}

export function stepStyle(pos: ViewerPos, dir: 1 | -1, n: number): ViewerPos {
  return { style: (pos.style + dir + n) % n, slide: 0 };
}
