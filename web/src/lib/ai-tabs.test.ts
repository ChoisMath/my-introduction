import { describe, expect, it } from 'vitest';
import { AI_TABS, activeTabId, aiTab } from './ai-tabs';

describe('AI_TABS', () => {
  it('starts with motion and every href lives under /ai/', () => {
    expect(AI_TABS[0]?.id).toBe('motion');
    for (const t of AI_TABS) expect(t.href).toMatch(/^\/ai\/[a-z0-9-]+\/$/);
  });
  it('finds the active tab by path prefix', () => {
    expect(activeTabId('/ai/motion/')).toBe('motion');
    expect(activeTabId('/ai/motion/01-pixel/')).toBe('motion');
    expect(activeTabId('/ai/join/')).toBeNull();
  });
  it('gives every tab a short label and an intro sentence', () => {
    for (const t of AI_TABS) {
      expect(t.label.ko.length).toBeLessThanOrEqual(4);
      expect(t.intro.ko.length).toBeGreaterThan(10);
    }
    expect(aiTab('slide').href).toBe('/ai/slide/');
    expect(() => aiTab('nope')).toThrow();
  });
  it('has the slide and brand tabs after motion', () => {
    expect(AI_TABS.map((t) => t.id)).toEqual(['motion', 'slide', 'brand']);
    expect(activeTabId('/ai/slide/')).toBe('slide');
    expect(activeTabId('/ai/brand/')).toBe('brand');
  });
});
