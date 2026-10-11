import { describe, expect, it } from 'vitest';
import { splitGallery, type SourceItem } from '../motion-import';

const src: SourceItem = {
  id: '11-rpg', no: '11', g: '게임·만화', name: 'RPG 게임 화면', use: '퀘스트형 강의 소개', en: 'RPG Game Screen',
  concept: '마을 광장', prompt: '## 1. Channel {{Channel name=Chois의 바이브코딩}}', ko: '## 1. 채널',
  shots: [['0.0–1.0', '장면', '이유']], cues: [['0.000', 'kick', 'first frame']],
};

describe('splitGallery', () => {
  const { publicList, adminList } = splitGallery([src], ['11-rpg']);
  it('keeps only public keys and converts no to a number', () => {
    expect(publicList).toEqual([{ id: '11-rpg', no: 11, group: '게임·만화', name: 'RPG 게임 화면', en: 'RPG Game Screen', use: '퀘스트형 강의 소개', concept: '마을 광장', featured: true }]);
    expect(JSON.stringify(publicList)).not.toContain('Channel');
  });
  it('moves prompt, shots and cues to the admin list', () => {
    expect(adminList).toEqual([{ id: '11-rpg', prompt: src.prompt, ko: src.ko, shots: src.shots, cues: src.cues }]);
  });
  it('marks non-listed ids as not featured', () => {
    expect(splitGallery([src], []).publicList[0]?.featured).toBe(false);
  });
});
