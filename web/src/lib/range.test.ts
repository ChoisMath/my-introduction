import { describe, expect, it } from 'vitest';
import { parseRange } from './range';

describe('parseRange', () => {
  it('returns null without a header', () => expect(parseRange(null, 100)).toBeNull());
  it('parses a closed range', () => expect(parseRange('bytes=0-99', 1000)).toEqual({ start: 0, end: 99 }));
  it('parses an open range', () => expect(parseRange('bytes=900-', 1000)).toEqual({ start: 900, end: 999 }));
  it('parses a suffix range', () => expect(parseRange('bytes=-100', 1000)).toEqual({ start: 900, end: 999 }));
  it('clamps an end past the file', () => expect(parseRange('bytes=10-5000', 1000)).toEqual({ start: 10, end: 999 }));
  it('clamps a suffix longer than the file', () => expect(parseRange('bytes=-5000', 1000)).toEqual({ start: 0, end: 999 }));
  it('marks a start past the end unsatisfiable', () => expect(parseRange('bytes=1000-', 1000)).toBe('unsatisfiable'));
  it('marks a zero suffix unsatisfiable', () => expect(parseRange('bytes=-0', 1000)).toBe('unsatisfiable'));
  it('ignores malformed and multi-range headers', () => {
    expect(parseRange('bytes=abc', 1000)).toBeNull();
    expect(parseRange('bytes=0-1,5-6', 1000)).toBeNull();
    expect(parseRange('items=0-1', 1000)).toBeNull();
    expect(parseRange('bytes=50-10', 1000)).toBeNull();
    expect(parseRange('bytes=-', 1000)).toBeNull();
  });
});
