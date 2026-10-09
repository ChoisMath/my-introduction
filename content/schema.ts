import { z } from 'zod';

export const localeSchema = z.enum(['ko', 'en']);
export type Locale = z.infer<typeof localeSchema>;

export const timelineKindSchema = z.enum([
  'edu', 'career', 'award', 'cert', 'group', 'material', 'lecture-teacher', 'lecture-student',
]);

export const timelineItemSchema = z.object({
  id: z.string().min(1),
  period: z.string().min(1),
  title: z.string().min(1),
  org: z.string().optional(),
  detail: z.string().optional(),
  kind: timelineKindSchema,
  // 영상·히어로 배지에 쓰는 대표 항목
  highlight: z.boolean().optional(),
});
export type TimelineItem = z.infer<typeof timelineItemSchema>;

export const bookSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  role: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  isbn: z.string().regex(/^\d{13}$/),
  publisher: z.string().optional(),
  url: z.url(),
  cover: z.string().startsWith('/img/'),
});
export type Book = z.infer<typeof bookSchema>;

export const pillarSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  items: z.array(z.string().min(1)).min(1).max(4),
});
export type Pillar = z.infer<typeof pillarSchema>;

const timelineArray = z.array(timelineItemSchema);

export const profileSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  intro: z.string().min(1),
  affiliation: z.string().min(1),
  role: z.string().min(1),
  since: z.string().regex(/^\d{4}-\d{2}$/),
  photo: z.string().startsWith('/img/'),
  pictogram: z.string().startsWith('/img/'),
  education: timelineArray,
  career: timelineArray,
  awards: timelineArray,
  groups: timelineArray,
  materials: timelineArray,
  lecturesTeacher: timelineArray,
  lecturesStudent: timelineArray,
  books: z.array(bookSchema),
  pillars: z.array(pillarSchema).length(3),
  links: z.object({
    email: z.email(),
    github: z.url(),
    sites: z.array(z.object({ label: z.string().min(1), url: z.url() })),
  }),
});
export type Profile = z.infer<typeof profileSchema>;

export const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().optional(),
  stack: z.array(z.string().min(1)).min(1),
  url: z.url().optional(),
  urlNote: z.string().optional(),
  youtubeId: z.string().optional(),
  mockup: z.string().startsWith('/img/projects/'),
});
export type Project = z.infer<typeof projectSchema>;
export const projectsSchema = z.array(projectSchema).min(1);

export const uiSchema = z.object({
  siteTitle: z.string().min(1),
  siteDescription: z.string().min(1),
  nav: z.object({
    hero: z.string(), stats: z.string(), timeline: z.string(), pillars: z.string(),
    projects: z.string(), books: z.string(), lectures: z.string(), contact: z.string(),
  }),
  hero: z.object({ watchVideo: z.string(), playVideo: z.string(), closeVideo: z.string(), scrollHint: z.string() }),
  stats: z.object({ years: z.string(), lectures: z.string(), books: z.string(), services: z.string(), awards: z.string() }),
  sections: z.object({
    stats: z.string(), timeline: z.string(), education: z.string(), awards: z.string(), pillars: z.string(),
    projects: z.string(), books: z.string(), materials: z.string(), lectures: z.string(), contact: z.string(),
  }),
  projects: z.object({ visit: z.string(), watch: z.string(), stack: z.string() }),
  lectures: z.object({ teacher: z.string(), student: z.string(), period: z.string(), title: z.string(), org: z.string() }),
  contact: z.object({ email: z.string(), github: z.string(), sites: z.string() }),
  lang: z.object({ switchTo: z.string(), switchLabel: z.string() }),
  footer: z.string(),
});
export type Ui = z.infer<typeof uiSchema>;

const hex = z.string().regex(/^#[0-9A-F]{6}$/);
export const tokensSchema = z.object({
  color: z.object({
    bg: hex, fg: hex, muted: hex, accent: hex, accentSoft: hex, grid: hex, line: hex,
    darkBg: hex, darkSurface: hex, darkFg: hex, darkMuted: hex, darkAccent: hex,
  }),
  font: z.object({ sans: z.string().min(1), mono: z.string().min(1) }),
  radius: z.object({ card: z.string().min(1) }),
});
export type Tokens = z.infer<typeof tokensSchema>;

export const contentSchema = z.object({ profile: profileSchema, projects: projectsSchema, ui: uiSchema });
export type Content = z.infer<typeof contentSchema>;
