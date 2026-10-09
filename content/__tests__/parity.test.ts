import { describe, expect, it } from 'vitest';
import { checkParity, getContent, locales } from '../index';

describe('ko/en parity', () => {
  it('both locales load', () => {
    for (const l of locales) expect(getContent(l).profile.since).toBe('2012-03');
  });
  it('ko and en have identical id sets and array lengths', () => {
    expect(checkParity(getContent('ko'), getContent('en'))).toEqual([]);
  });
  it('reports the missing id by name', () => {
    const ko = getContent('ko');
    const en = structuredClone(getContent('en'));
    en.profile.career = en.profile.career.filter((c) => c.id !== 'car-2026');
    const problems = checkParity(ko, en);
    expect(problems.join('\n')).toContain('car-2026');
    expect(problems.join('\n')).toContain('profile.career');
  });
  it('reports a project present only in one locale', () => {
    const ko = getContent('ko');
    const en = structuredClone(getContent('en'));
    en.projects = en.projects.filter((p) => p.id !== 'mathcoach');
    expect(checkParity(ko, en).join('\n')).toContain('projects: mathcoach');
  });
});

describe('ko/en parity of nested arrays', () => {
  it('reports a link site present only in one locale', () => {
    const ko = getContent('ko');
    const en = structuredClone(getContent('en'));
    en.profile.links.sites = en.profile.links.sites.slice(0, 1);
    expect(checkParity(ko, en).join('\n')).toContain('profile.links.sites');
  });
  it('reports a pillar item count mismatch', () => {
    const ko = getContent('ko');
    const en = structuredClone(getContent('en'));
    en.profile.pillars[0]!.items = en.profile.pillars[0]!.items.slice(0, 1);
    expect(checkParity(ko, en).join('\n')).toContain('profile.pillars[teach].items');
  });
  it('reports a project stack count mismatch', () => {
    const ko = getContent('ko');
    const en = structuredClone(getContent('en'));
    en.projects[0]!.stack = en.projects[0]!.stack.slice(0, 1);
    expect(checkParity(ko, en).join('\n')).toContain('projects[choisnote].stack');
  });
});
