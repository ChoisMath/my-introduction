import { describe, expect, it } from 'vitest';
import { splitGallery, type OriginalItem, type SourceItem } from '../motion-import';

const src: SourceItem = {
  id: '11-rpg', no: '11', g: '게임·만화', name: 'RPG 게임 화면', use: '퀘스트형 강의 소개', en: 'RPG Game Screen',
  concept: '마을 광장', prompt: '## 1. Channel {{Channel name=Chois의 바이브코딩}}', ko: '## 1. 채널',
  shots: [['0.0–1.0', '장면', '이유']], cues: [['0.000', 'kick', 'first frame']],
};

describe('splitGallery', () => {
  const { publicList, adminList } = splitGallery([src], ['11-rpg']);
  it('keeps only public keys and converts no to a number', () => {
    expect(publicList).toEqual([{ id: '11-rpg', no: 11, group: '게임·만화', name: 'RPG 게임 화면', en: 'RPG Game Screen', use: '퀘스트형 강의 소개', concept: '마을 광장', featured: true, source: 'chois' }]);
    expect(JSON.stringify(publicList)).not.toContain('Channel');
  });
  it('moves prompt, shots and cues to the admin list', () => {
    expect(adminList).toEqual([{ id: '11-rpg', prompt: src.prompt, ko: src.ko, shots: src.shots, cues: src.cues }]);
  });
  it('marks non-listed ids as not featured', () => {
    expect(splitGallery([src], []).publicList[0]?.featured).toBe(false);
  });
});

describe('splitGallery with originals', () => {
  const original = (id: string, no: string): OriginalItem => ({
    id, no, g: '포스터·인쇄', name: `원본 ${no}`, use: '홍보', en: 'Poster', concept: '원본 컨셉',
    final: { en: `EN ${id}`, ko: `KO ${id}` }, shots: [['0.0–1.0', '장면', '이유']], cues: [['0.000', 'kick', 'hit']],
  });
  const { publicList, adminList } = splitGallery([src], [], [original('11-rpg', '11'), original('101-gold-foil-invitation', '101')]);
  it('keeps the remade item and adds only originals without a remake, marked as oppadu', () => {
    expect(publicList.map((m) => [m.id, m.no, m.source])).toEqual([['11-rpg', 11, 'chois'], ['101-gold-foil-invitation', 101, 'oppadu']]);
  });
  it('uses the prefilled final prompts of originals as prompt/ko', () => {
    expect(adminList[1]).toMatchObject({ id: '101-gold-foil-invitation', prompt: 'EN 101-gold-foil-invitation', ko: 'KO 101-gold-foil-invitation' });
    expect(adminList[0]?.prompt).toBe(src.prompt);
  });
});
