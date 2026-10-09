import { describe, expect, it } from 'vitest';
import { FPS, HERO_LOOP_DURATION, SCENE_IDS, buildScenes, projectSchedule, sceneFrames, timelineSchedule, type Manifest } from './timeline';

const careerIds = ['car-2012', 'car-2014', 'car-2019', 'car-2025', 'car-2026'];
const projectIds = ['choisnote', 'choisclass', 'posanmeal', 'selfstudy', 'mathcoach'];
const empty: Manifest = {};
const m: Manifest = {
  opening: { text: 'o', duration: 2.2 },
  tagline: { text: 't', duration: 18 },
  'timeline.car-2012': { text: 'a', duration: 3 },
  'timeline.car-2019': { text: 'b', duration: 5 },
  pillars: { text: 'p', duration: 7 },
  'projects.choisnote': { text: 'c', duration: 1.2 },
  'projects.mathcoach': { text: 'm', duration: 3 },
  ending: { text: 'e', duration: 5.5 },
};

describe('buildScenes', () => {
  it('keeps the fixed scene order and is contiguous from 0', () => {
    const scenes = buildScenes(empty, careerIds, projectIds);
    expect(scenes.map((s) => s.id)).toEqual([...SCENE_IDS]);
    expect(scenes[0]?.from).toBe(0);
    for (let i = 1; i < scenes.length; i++) expect(scenes[i]?.from).toBe(scenes[i - 1]?.to);
  });
  it('falls back to minimum lengths without narration', () => {
    const by = Object.fromEntries(buildScenes(empty, careerIds, projectIds).map((s) => [s.id, s.to - s.from]));
    expect(by.opening).toBe(6);
    expect(by.tagline).toBe(8);
    expect(by.pillars).toBe(8);
    expect(by.ending).toBe(6);
    expect(by.timeline).toBeGreaterThanOrEqual(2 + careerIds.length * 2.1 + 3);
  });
  it('stretches scenes to fit narration', () => {
    const by = Object.fromEntries(buildScenes(m, careerIds, projectIds).map((s) => [s.id, s.to - s.from]));
    expect(by.tagline).toBeCloseTo(0.5 + 18 + 1.5, 5);
    expect(by.pillars).toBeCloseTo(0.5 + 7 + 2, 5);
    expect(by.ending).toBeCloseTo(0.8 + 5.5 + 2.5, 5);
    expect(by.opening).toBeCloseTo(4.5 + 2.2 + 0.8, 5);
  });
  it('converts a scene to whole frames', () => {
    const scenes = buildScenes(empty, careerIds, projectIds);
    const f = sceneFrames(scenes, 'tagline');
    expect(f).toEqual({ from: 6 * FPS, durationInFrames: 8 * FPS });
    expect(Number.isInteger(f.from) && Number.isInteger(f.durationInFrames)).toBe(true);
    expect(() => sceneFrames(scenes, 'nope' as never)).toThrow();
  });
});

describe('schedules', () => {
  it('places timeline nodes one after another with a gap after each clip', () => {
    const s = timelineSchedule(m, careerIds, FPS);
    expect(s.map((x) => x.id)).toEqual(careerIds);
    expect(s[0]?.from).toBe(2 * FPS);
    expect(s[1]?.from).toBe(2 * FPS + Math.round((3 + 0.5) * FPS));
    // 대본이 없는 노드는 1.6초를 차지한다
    expect(s[2]!.from - s[1]!.from).toBe(Math.round((1.6 + 0.5) * FPS));
  });
  it('gives every project at least 2.4 seconds and starts after one second', () => {
    const s = projectSchedule(m, projectIds, FPS);
    expect(s[0]?.from).toBe(FPS);
    for (const slot of s) expect(slot.durationInFrames).toBeGreaterThanOrEqual(Math.round(2.4 * FPS));
    expect(s[4]?.durationInFrames).toBe(Math.round((3 + 1.4) * FPS));
  });
  it('keeps the hero loop at 20 seconds', () => {
    expect(HERO_LOOP_DURATION).toBe(600);
  });
});
