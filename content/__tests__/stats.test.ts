import { describe, expect, it } from 'vitest';
import { computeStats } from '../stats';
import { getContent } from '../index';

describe('computeStats', () => {
  const ko = getContent('ko');
  it('counts the 15th year of service in 2026', () => {
    expect(computeStats(ko, new Date('2026-10-09')).years).toBe(15);
  });
  it('is the 14th year just before the March anniversary', () => {
    expect(computeStats(ko, new Date('2026-02-15')).years).toBe(14);
  });
  it('derives other numbers from the arrays', () => {
    const s = computeStats(ko, new Date('2026-10-09'));
    expect(s.books).toBe(3);
    expect(s.services).toBe(5);
    expect(s.awards).toBe(ko.profile.awards.filter((a) => a.kind === 'award').length);
  });
});
