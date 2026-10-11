import { describe, expect, it } from 'vitest';
import { isAdminEmail } from './admin-emails';

describe('isAdminEmail', () => {
  const raw = ' Admin@Example.com , second@example.com,';
  it('matches case- and space-insensitively', () => {
    expect(isAdminEmail('admin@example.com', raw)).toBe(true);
    expect(isAdminEmail(' SECOND@example.com ', raw)).toBe(true);
  });
  it('rejects others and empty input', () => {
    expect(isAdminEmail('other@example.com', raw)).toBe(false);
    expect(isAdminEmail(null, raw)).toBe(false);
    expect(isAdminEmail('', raw)).toBe(false);
    expect(isAdminEmail('admin@example.com', undefined)).toBe(false);
    expect(isAdminEmail('', ',')).toBe(false);
  });
});
