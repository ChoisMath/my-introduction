import { contentSchema, tokensSchema, type Content, type Locale, type Profile } from './schema';
import rawTokens from './tokens.json';
import profileKo from './ko/profile.json';
import projectsKo from './ko/projects.json';
import uiKo from './ko/ui.json';
import profileEn from './en/profile.json';
import projectsEn from './en/projects.json';
import uiEn from './en/ui.json';

export * from './schema';
export { computeStats, type Stats } from './stats';

export const locales = ['ko', 'en'] as const;
export const tokens = tokensSchema.parse(rawTokens);

const raw: Record<Locale, unknown> = {
  ko: { profile: profileKo, projects: projectsKo, ui: uiKo },
  en: { profile: profileEn, projects: projectsEn, ui: uiEn },
};

const cache = new Map<Locale, Content>();

export function getContent(locale: Locale): Content {
  const hit = cache.get(locale);
  if (hit) return hit;
  const parsed = contentSchema.parse(raw[locale]);
  cache.set(locale, parsed);
  return parsed;
}

const timelineKeys = [
  'education', 'career', 'awards', 'groups', 'materials', 'lecturesTeacher', 'lecturesStudent',
] as const;

export function idsOf(profile: Profile): string[] {
  return timelineKeys.flatMap((k) => profile[k].map((x) => x.id));
}

function diffIds(label: string, a: string[], b: string[]): string[] {
  const out: string[] = [];
  const sa = new Set(a);
  const sb = new Set(b);
  for (const id of a) if (!sb.has(id)) out.push(`${label}: ${id} exists only in ko`);
  for (const id of b) if (!sa.has(id)) out.push(`${label}: ${id} exists only in en`);
  return out;
}

export function checkParity(ko: Content, en: Content): string[] {
  const problems: string[] = [];
  for (const k of timelineKeys) {
    problems.push(...diffIds(`profile.${k}`, ko.profile[k].map((x) => x.id), en.profile[k].map((x) => x.id)));
  }
  problems.push(...diffIds('profile.books', ko.profile.books.map((b) => b.id), en.profile.books.map((b) => b.id)));
  problems.push(...diffIds('profile.pillars', ko.profile.pillars.map((p) => p.id), en.profile.pillars.map((p) => p.id)));
  problems.push(...diffIds('projects', ko.projects.map((p) => p.id), en.projects.map((p) => p.id)));
  if (ko.profile.since !== en.profile.since) problems.push('profile.since differs');
  return problems;
}
