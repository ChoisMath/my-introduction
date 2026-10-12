import { describe, expect, it } from 'vitest';
import { buildSlideData, parseSchoolManifest, type SchoolEntry } from './slide-import';

const entry = (id: string, no: number): SchoolEntry => ({
  id, no, family: 'hand', name: `n${id}`, look: 'l', use: 'u', topic: 't', cover: 1, body: 3, added: '2026-10-12',
});

describe('buildSlideData', () => {
  it('keeps manifest order, takes page counts from the deck and splits prompts out', () => {
    const decks = new Map([['59', { pages: 7, prompt: ' p59 \n' }], ['24', { pages: 8, prompt: 'p24' }]]);
    const { publicList, adminList } = buildSlideData([entry('24', 24), entry('59', 59)], decks);
    expect(publicList.map((s) => [s.id, s.slides])).toEqual([['24', 8], ['59', 7]]);
    expect(adminList).toEqual([{ id: '24', prompt: 'p24' }, { id: '59', prompt: 'p59' }]);
    expect(JSON.stringify(publicList)).not.toContain('p24');
  });
  it('skips entries without a confirmed deck', () => {
    const { publicList } = buildSlideData([entry('24', 24), entry('63', 63)], new Map([['24', { pages: 8, prompt: 'p' }]]));
    expect(publicList.map((s) => s.id)).toEqual(['24']);
  });
  it('fails when cover or body points past the deck', () => {
    expect(() => buildSlideData([{ ...entry('24', 24), body: 9 }], new Map([['24', { pages: 8, prompt: 'p' }]]))).toThrow();
  });
});

describe('parseSchoolManifest', () => {
  it('rejects ids that could reach outside media/slide before any file is removed', () => {
    for (const id of ['', '../..', '24/../..', '7']) {
      expect(() => parseSchoolManifest([{ ...entry('24', 24), id }]), id).toThrow();
    }
    expect(() => parseSchoolManifest([{ no: 1 }])).toThrow();
  });
  it('accepts the source manifest shape', () => {
    expect(parseSchoolManifest([entry('24', 24)]).map((e) => e.id)).toEqual(['24']);
  });
});
