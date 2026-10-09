import { describe, expect, it } from 'vitest';
import { yearOf } from './format';

describe('yearOf', () => {
  it('extracts the first year from a Korean period', () => {
    expect(yearOf('2012.03 ~ 2014.02')).toBe('2012');
    expect(yearOf('2026.03 ~ 현재')).toBe('2026');
  });
  it('extracts the first year from an English period', () => {
    expect(yearOf('Mar 2012 – Feb 2014')).toBe('2012');
    expect(yearOf('– Aug 2011')).toBe('2011');
  });
  it('returns the input when no year is present', () => {
    expect(yearOf('현재')).toBe('현재');
  });
});
