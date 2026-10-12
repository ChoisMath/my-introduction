import { describe, expect, it } from 'vitest';
import { errorTag } from './log';

describe('errorTag', () => {
  it('keeps only the error name and Prisma code', () => {
    const error = Object.assign(new Error('Unique constraint on a@b.c'), { name: 'PrismaClientKnownRequestError', code: 'P2002' });
    expect(errorTag(error)).toBe('PrismaClientKnownRequestError P2002');
    expect(errorTag(error)).not.toContain('@');
  });
  it('handles non-errors', () => {
    expect(errorTag('boom a@b.c')).toBe('unknown');
    expect(errorTag(null)).toBe('unknown');
  });
});
