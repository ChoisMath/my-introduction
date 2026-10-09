import { describe, expect, it } from 'vitest';
import { localePath, otherLocale, toggleHref } from './locale';

describe('locale helpers', () => {
  it('maps locales to static paths', () => {
    expect(localePath('ko')).toBe('/');
    expect(localePath('en')).toBe('/en/');
  });
  it('toggles to the other locale keeping the hash', () => {
    expect(toggleHref('ko', '#projects')).toBe('/en/#projects');
    expect(toggleHref('en', '#projects')).toBe('/#projects');
  });
  it('ignores an empty or malformed hash', () => {
    expect(toggleHref('ko', '')).toBe('/en/');
    expect(toggleHref('en', 'projects')).toBe('/');
    expect(toggleHref('ko', '#')).toBe('/en/');
  });
  it('otherLocale flips', () => {
    expect(otherLocale('ko')).toBe('en');
    expect(otherLocale('en')).toBe('ko');
  });
});
