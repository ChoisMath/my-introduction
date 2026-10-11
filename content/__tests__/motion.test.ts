import { describe, expect, it } from 'vitest';
import { getMotion, getMotionList, MOTION_GROUPS, motionPublicSchema, motionAdminSchema, mediaManifestSchema } from '../index';

const sample = { id: '01-pixel', no: 1, group: '게임·만화', name: '도트 픽셀 아트', en: 'Pixel Art', use: '게임 느낌', concept: '횡스크롤', featured: true };

describe('motion schemas', () => {
  it('accepts a public item', () => {
    expect(motionPublicSchema.parse(sample)).toEqual(sample);
  });
  it('rejects admin-only keys in a public item', () => {
    expect(() => motionPublicSchema.parse({ ...sample, prompt: '## 1. Channel' })).toThrow();
    expect(() => motionPublicSchema.parse({ ...sample, shots: [] })).toThrow();
  });
  it('rejects malformed ids', () => {
    expect(() => motionPublicSchema.parse({ ...sample, id: '../x' })).toThrow();
    expect(() => motionPublicSchema.parse({ ...sample, id: '1-pixel' })).toThrow();
  });
  it('accepts an admin item with 3-column rows', () => {
    const a = { id: '01-pixel', prompt: 'p', ko: 'k', shots: [['0.0–1.0', 's', 'w']], cues: [['0.000', 'kick', 'first frame']] };
    expect(motionAdminSchema.parse(a)).toEqual(a);
    expect(() => motionAdminSchema.parse({ ...a, shots: [['0.0', 's']] })).toThrow();
  });
  it('validates manifest entries', () => {
    const ok = { 'media/motion/01-pixel/video.mp4': { size: 10, sha256: 'a'.repeat(64), updatedAt: '2026-10-12T00:00:00.000Z' } };
    expect(mediaManifestSchema.parse(ok)).toEqual(ok);
    expect(() => mediaManifestSchema.parse({ x: { size: 1, sha256: 'zz', updatedAt: '' } })).toThrow();
  });
});

describe('motion public.json', () => {
  const list = getMotionList();
  it('has 50 unique items sorted by number', () => {
    expect(list).toHaveLength(50);
    expect(new Set(list.map((m) => m.id)).size).toBe(50);
    expect(list.map((m) => m.no)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });
  it('uses only known groups', () => {
    for (const m of list) expect(MOTION_GROUPS).toContain(m.group);
  });
  it('finds items by id', () => {
    expect(getMotion('11-rpg')?.no).toBe(11);
    expect(getMotion('nope')).toBeNull();
  });
});
