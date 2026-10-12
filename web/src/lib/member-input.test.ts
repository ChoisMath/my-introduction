import { describe, expect, it } from 'vitest';
import { adminAddSchema, applySchema, memberIdSchema } from './member-input';

describe('applySchema', () => {
  it('trims name and affiliation', () => {
    expect(applySchema.parse({ name: ' 김교사 ', affiliation: ' 포산고등학교 ' })).toEqual({ name: '김교사', affiliation: '포산고등학교' });
  });
  it('rejects blank, too long and control characters', () => {
    expect(applySchema.safeParse({ name: '   ', affiliation: '학교' }).success).toBe(false);
    expect(applySchema.safeParse({ name: '가', affiliation: '' }).success).toBe(false);
    expect(applySchema.safeParse({ name: 'x'.repeat(31), affiliation: '학교' }).success).toBe(false);
    expect(applySchema.safeParse({ name: '가', affiliation: 'x'.repeat(51) }).success).toBe(false);
    expect(applySchema.safeParse({ name: '가\u0007', affiliation: '학교' }).success).toBe(false);
  });
  it('accepts the exact limits', () => {
    expect(applySchema.safeParse({ name: 'x'.repeat(30), affiliation: 'y'.repeat(50) }).success).toBe(true);
  });
});

describe('applySchema control characters', () => {
  it.each([['DEL', '\u007f'], ['C1', '\u0085'], ['bidi override', '\u202e'], ['bidi isolate', '\u2066']])('rejects %s', (_label, ch) => {
    expect(applySchema.safeParse({ name: '이름', affiliation: `소${ch}속` }).success).toBe(false);
    expect(applySchema.safeParse({ name: `이${ch}름`, affiliation: '소속' }).success).toBe(false);
  });
});

describe('adminAddSchema', () => {
  it('normalizes email', () => {
    expect(adminAddSchema.parse({ email: ' New@Example.COM ', name: '이름', affiliation: '소속' }).email).toBe('new@example.com');
    expect(adminAddSchema.safeParse({ email: 'nope', name: '이름', affiliation: '소속' }).success).toBe(false);
  });
});

describe('memberIdSchema', () => {
  it('accepts positive integer strings only', () => {
    expect(memberIdSchema.parse('3')).toBe(3);
    expect(memberIdSchema.safeParse('0').success).toBe(false);
    expect(memberIdSchema.safeParse('1.5').success).toBe(false);
  });
});
