import { contentSchema, narrationSchema, tokensSchema, type Content, type Locale, type Narration, type Profile } from './schema';
import narrationKo from './ko/narration.json';
import narrationEn from './en/narration.json';
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

const narrations: Record<Locale, unknown> = { ko: narrationKo, en: narrationEn };

// 대본이 없는 로케일은 null 이며 영상은 내레이션 없이 기본 길이로 렌더된다.
export function getNarration(locale: Locale): Narration | null {
  return narrationSchema.parse(narrations[locale]);
}

// 내레이션 클립 키: 'opening' | 'tagline' | 'timeline.car-2012' | 'projects.choisnote' | ...
export function narrationKeys(n: Narration): { key: string; text: string }[] {
  return [
    { key: 'opening', text: n.opening },
    { key: 'tagline', text: n.tagline },
    ...Object.entries(n.timeline).map(([id, text]) => ({ key: `timeline.${id}`, text })),
    { key: 'pillars', text: n.pillars },
    ...Object.entries(n.projects).map(([id, text]) => ({ key: `projects.${id}`, text })),
    { key: 'ending', text: n.ending },
  ];
}

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
  if (ko.profile.links.sites.length !== en.profile.links.sites.length) problems.push('profile.links.sites length differs');
  for (const kp of ko.profile.pillars) {
    const ep = en.profile.pillars.find((p) => p.id === kp.id);
    if (ep && ep.items.length !== kp.items.length) problems.push(`profile.pillars[${kp.id}].items length differs`);
  }
  for (const kp of ko.projects) {
    const ep = en.projects.find((p) => p.id === kp.id);
    if (ep && ep.stack.length !== kp.stack.length) problems.push(`projects[${kp.id}].stack length differs`);
  }
  if (ko.profile.since !== en.profile.since) problems.push('profile.since differs');
  return problems;
}
