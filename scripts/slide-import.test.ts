import { describe, expect, it } from 'vitest';
import { buildSlideData, parseOriginalStyles, parseSchoolManifest, type OriginalStyle, type SchoolEntry } from './slide-import';

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

describe('buildSlideData with originals', () => {
  const original = (id: string, no: number): OriginalStyle => ({
    id, no, family: 'work', name: `o${id}`, look: 'ol', use: 'ou', slides: 6, cover: 1, body: 2, added: '2026-10-20', prompt: ` op${id} `,
  });
  const decks = new Map([['24', { pages: 8, prompt: 'p24' }]]);
  it('follows the original popularity order and puts the school deck in its place', () => {
    const { publicList, adminList } = buildSlideData([entry('24', 24), entry('63', 63)], decks, [original('200', 200), original('24', 24), original('63', 63)]);
    expect(publicList.map((s) => [s.id, s.source, s.slides])).toEqual([['200', 'oppadu', 6], ['24', 'school', 8], ['63', 'oppadu', 6]]);
    expect(publicList[0]?.topic).toBeUndefined();
    expect(adminList).toEqual([{ id: '200', prompt: 'op200' }, { id: '24', prompt: 'p24' }, { id: '63', prompt: 'op63' }]);
  });
  it('keeps school decks the original list no longer has, at the end', () => {
    const { publicList } = buildSlideData([entry('24', 24)], decks, [original('200', 200)]);
    expect(publicList.map((s) => s.id)).toEqual(['200', '24']);
  });
  it('parses original styles without a prompt as invalid', () => {
    const { prompt: _p, ...noPrompt } = original('200', 200);
    expect(() => parseOriginalStyles([noPrompt])).toThrow();
    expect(parseOriginalStyles([{ ...original('200', 200), sub: '부제' }])[0]).not.toHaveProperty('sub');
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
