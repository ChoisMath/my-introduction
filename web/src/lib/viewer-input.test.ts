import { describe, expect, it } from 'vitest';
import { viewerIdSchema, viewerInputSchema } from './viewer-input';

describe('viewerInputSchema', () => {
  it('normalizes email and empty note', () => {
    expect(viewerInputSchema.parse({ email: '  Student@Example.COM ', note: '  ' })).toEqual({ email: 'student@example.com', note: null });
    expect(viewerInputSchema.parse({ email: 'a@b.co' })).toEqual({ email: 'a@b.co', note: null });
    expect(viewerInputSchema.parse({ email: 'a@b.co', note: ' 2학년 ' }).note).toBe('2학년');
  });
  it('rejects invalid email and long note', () => {
    expect(viewerInputSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
    expect(viewerInputSchema.safeParse({ email: '' }).success).toBe(false);
    expect(viewerInputSchema.safeParse({ email: 'a@b.co', note: 'x'.repeat(101) }).success).toBe(false);
  });
});

describe('viewerIdSchema', () => {
  it('accepts positive integer strings only', () => {
    expect(viewerIdSchema.parse('3')).toBe(3);
    expect(viewerIdSchema.safeParse('0').success).toBe(false);
    expect(viewerIdSchema.safeParse('1.5').success).toBe(false);
    expect(viewerIdSchema.safeParse('abc').success).toBe(false);
  });
});
