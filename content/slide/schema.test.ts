import { describe, expect, it } from 'vitest';
import { getSlideList, slideAdminListSchema, slidePublicListSchema, slidePublicSchema } from './index';

const base = {
  id: '24', no: 24, family: 'hand', name: '스케치노트', look: '설명', use: '용도', topic: '주제',
  slides: 8, cover: 1, body: 3, added: '2026-10-12',
};
const POPULAR = ['24', '59', '55', '04', '58', '10', '63'];

describe('slidePublicSchema', () => {
  it('accepts a valid entry', () => {
    expect(slidePublicSchema.parse(base).id).toBe('24');
  });
  it('rejects admin fields so prompts can never ride along', () => {
    expect(() => slidePublicSchema.parse({ ...base, prompt: 'x' })).toThrow();
  });
  it('rejects bad ids and families', () => {
    expect(() => slidePublicSchema.parse({ ...base, id: '7' })).toThrow();
    expect(() => slidePublicSchema.parse({ ...base, id: '24-a' })).toThrow();
    expect(() => slidePublicSchema.parse({ ...base, family: 'neon' })).toThrow();
  });
});

describe('slidePublicListSchema', () => {
  it('rejects cover/body beyond the deck and duplicate ids', () => {
    expect(() => slidePublicListSchema.parse([{ ...base, cover: 9 }])).toThrow();
    expect(() => slidePublicListSchema.parse([{ ...base, body: 0 }])).toThrow();
    expect(() => slidePublicListSchema.parse([base, { ...base, no: 25 }])).toThrow();
  });
});

describe('slideAdminListSchema', () => {
  it('needs id and prompt only', () => {
    expect(slideAdminListSchema.parse([{ id: '24', prompt: 'p' }])).toHaveLength(1);
    expect(() => slideAdminListSchema.parse([{ id: '24', prompt: '' }])).toThrow();
    expect(() => slideAdminListSchema.parse([{ id: '24', prompt: 'p', ko: 'x' }])).toThrow();
  });
});

describe('getSlideList', () => {
  it('parses the committed public.json and keeps popularity order', () => {
    const ids = getSlideList().map((s) => s.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toEqual([...ids].sort((a, b) => POPULAR.indexOf(a) - POPULAR.indexOf(b)));
  });
});
