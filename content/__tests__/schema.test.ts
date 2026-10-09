import { describe, expect, it } from 'vitest';
import { profileSchema, projectsSchema, uiSchema, tokensSchema } from '../schema';
import profileKo from '../ko/profile.json';
import projectsKo from '../ko/projects.json';
import uiKo from '../ko/ui.json';
import tokens from '../tokens.json';

describe('ko content matches schema', () => {
  it('profile parses and has 3 pillars and 3 books', () => {
    const p = profileSchema.parse(profileKo);
    expect(p.pillars).toHaveLength(3);
    expect(p.books).toHaveLength(3);
    expect(p.since).toBe('2012-03');
  });
  it('projects parses with 5 projects and unique ids', () => {
    const list = projectsSchema.parse(projectsKo);
    expect(list).toHaveLength(5);
    expect(new Set(list.map((x) => x.id)).size).toBe(5);
  });
  it('timeline ids are unique across all arrays', () => {
    const p = profileSchema.parse(profileKo);
    const ids = [...p.education, ...p.career, ...p.awards, ...p.groups, ...p.materials, ...p.lecturesTeacher, ...p.lecturesStudent].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('ui and tokens parse', () => {
    expect(() => uiSchema.parse(uiKo)).not.toThrow();
    expect(tokensSchema.parse(tokens).color.accent).toMatch(/^#[0-9A-F]{6}$/);
  });
  it('rejects an isbn that is not 13 digits', () => {
    const bad = { ...profileKo, books: [{ ...profileKo.books[0], isbn: '123' }] };
    expect(() => profileSchema.parse(bad)).toThrow();
  });
});

describe('profile schema shape', () => {
  it('has no nameLatin field (it was unused and misleading in en)', () => {
    expect('nameLatin' in profileSchema.shape).toBe(false);
  });
});
