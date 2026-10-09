import { describe, expect, it } from 'vitest';
import { loopVeil } from './loop';

// 히어로 루프의 경계를 흰색 베일로 부드럽게 잇는다: 시작 0.5초 fade-in, 끝 0.7초 fade-out.
describe('loopVeil', () => {
  const fps = 30; const total = 600;
  it('is fully opaque at the first frame and clear after half a second', () => {
    expect(loopVeil(0, total, fps)).toBe(1);
    expect(loopVeil(15, total, fps)).toBe(0);
    expect(loopVeil(300, total, fps)).toBe(0);
  });
  it('fades back to opaque over the last 0.7 seconds', () => {
    expect(loopVeil(total - 21, total, fps)).toBe(0);
    expect(loopVeil(total - 1, total, fps)).toBeGreaterThan(0.9);
  });
});
