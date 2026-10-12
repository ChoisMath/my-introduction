import { describe, expect, it } from 'vitest';
import { aiMotionAdminPath, aiMotionPath, joinPath, safeReturnPath, signOutReturnPath } from './ai-paths';

describe('safeReturnPath', () => {
  it('keeps paths under /ai/', () => {
    expect(safeReturnPath('/ai/motion/01-pixel/')).toBe('/ai/motion/01-pixel/');
    expect(safeReturnPath('/ai/motion/admin/01-pixel/')).toBe('/ai/motion/admin/01-pixel/');
    expect(safeReturnPath('/ai/')).toBe('/ai/');
    expect(safeReturnPath('/ai/slide/')).toBe('/ai/slide/');
  });
  it('falls back for anything else', () => {
    for (const bad of ['//evil.com', 'https://evil.com/ai/', '/ai/../admin/', '/motion/', '/ai/motion', '/ai/Motion/', null, 42, '/ai/a/b/c/d/']) {
      expect(safeReturnPath(bad)).toBe('/ai/motion/');
    }
  });
});

describe('joinPath', () => {
  it('encodes a safe from', () => {
    expect(joinPath('/ai/motion/01-pixel/')).toBe('/ai/join/?from=%2Fai%2Fmotion%2F01-pixel%2F');
    expect(joinPath('//evil.com')).toBe('/ai/join/?from=%2Fai%2Fmotion%2F');
    expect(joinPath()).toBe('/ai/join/?from=%2Fai%2Fmotion%2F');
  });
});

describe('signOutReturnPath', () => {
  it('stays on public pages', () => {
    expect(signOutReturnPath('/')).toBe('/');
    expect(signOutReturnPath('/en/')).toBe('/en/');
    expect(signOutReturnPath('/ai/motion/')).toBe('/ai/motion/');
    expect(signOutReturnPath('/ai/motion/01-pixel/')).toBe('/ai/motion/01-pixel/');
  });
  it('stays on the public slide gallery', () => {
    expect(signOutReturnPath('/ai/slide/')).toBe('/ai/slide/');
    expect(signOutReturnPath('/ai/slide/x/')).toBe('/ai/motion/');
  });
  it('leaves protected pages for the gallery', () => {
    expect(signOutReturnPath('/ai/motion/admin/')).toBe('/ai/motion/');
    expect(signOutReturnPath('/ai/motion/admin/01-pixel/')).toBe('/ai/motion/');
    expect(signOutReturnPath('/ai/admin/members/')).toBe('/ai/motion/');
    expect(signOutReturnPath('/ai/join/')).toBe('/ai/motion/');
  });
  it('unknown goes home', () => {
    expect(signOutReturnPath('https://evil.com')).toBe('/');
    expect(signOutReturnPath(undefined)).toBe('/');
  });
});

it('builds motion paths', () => {
  expect(aiMotionPath('01-pixel')).toBe('/ai/motion/01-pixel/');
  expect(aiMotionAdminPath('01-pixel')).toBe('/ai/motion/admin/01-pixel/');
});
