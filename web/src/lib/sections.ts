export const SECTION_IDS = ['hero', 'stats', 'timeline', 'pillars', 'projects', 'books', 'lectures', 'contact'] as const;
export type SectionId = (typeof SECTION_IDS)[number];
