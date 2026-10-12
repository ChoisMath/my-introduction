import { describe, expect, it } from 'vitest';
import { canUsePrompts, normalizeEmail, resolveRole } from './member-role';

describe('resolveRole', () => {
  it('admin env wins over any member row or db error', () => {
    expect(resolveRole(true, null)).toBe('admin');
    expect(resolveRole(true, { status: 'PENDING' })).toBe('admin');
    expect(resolveRole(true, 'error')).toBe('admin');
  });
  it('maps member rows and lookup failure for non-admins', () => {
    expect(resolveRole(false, { status: 'APPROVED' })).toBe('member');
    expect(resolveRole(false, { status: 'PENDING' })).toBe('pending');
    expect(resolveRole(false, null)).toBe('guest');
    expect(resolveRole(false, 'error')).toBe('unavailable');
  });
  it('only admin and member may use prompts', () => {
    expect(['admin', 'member', 'pending', 'guest', 'unavailable'].filter((r) => canUsePrompts(r as never))).toEqual(['admin', 'member']);
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases, empty becomes null', () => {
    expect(normalizeEmail('  Teacher@School.KR ')).toBe('teacher@school.kr');
    expect(normalizeEmail('   ')).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});
