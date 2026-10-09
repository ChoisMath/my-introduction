import { describe, expect, it } from 'vitest';
import { FPS, HERO_LOOP_DURATION, INTRO_DURATION, SCENES, sceneFrames } from './timeline';

describe('scene timeline', () => {
  it('is contiguous from 0 to 82 seconds with no gaps or overlaps', () => {
    expect(SCENES[0]?.from).toBe(0);
    for (let i = 1; i < SCENES.length; i++) expect(SCENES[i]?.from).toBe(SCENES[i - 1]?.to);
    expect(SCENES[SCENES.length - 1]?.to).toBe(82);
  });
  it('gives every scene at least 4 seconds', () => {
    for (const s of SCENES) expect(s.to - s.from).toBeGreaterThanOrEqual(4);
  });
  it('converts seconds to frames', () => {
    expect(sceneFrames('projects')).toEqual({ from: 50 * FPS, durationInFrames: 18 * FPS });
    expect(INTRO_DURATION).toBe(2460);
    expect(HERO_LOOP_DURATION).toBe(600);
  });
  it('throws on an unknown scene id', () => {
    expect(() => sceneFrames('nope' as never)).toThrow();
  });
});
