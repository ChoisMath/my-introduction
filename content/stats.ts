import type { Content } from './schema';

export type Stats = { years: number; books: number; services: number; awards: number };

// "N년차": 임용 월(3월)을 지나면 햇수를 하나 더 센다.
export function computeStats(content: Content, now: Date = new Date()): Stats {
  const [y, m] = content.profile.since.split('-').map(Number) as [number, number];
  const passedAnniversary = now.getMonth() + 1 >= m;
  const years = now.getFullYear() - y + (passedAnniversary ? 1 : 0);
  const p = content.profile;
  return {
    years,
    books: p.books.length,
    services: content.projects.length,
    awards: p.awards.filter((a) => a.kind === 'award').length,
  };
}
