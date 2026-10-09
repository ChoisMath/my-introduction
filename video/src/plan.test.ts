import { describe, expect, it } from 'vitest';
import { buildPlan } from './plan';

describe('buildPlan', () => {
  it('ko: timeline nodes are exactly the narrated career entries (2013 instructor excluded)', () => {
    const plan = buildPlan('ko');
    expect(plan.careerIds).toEqual(['car-2012', 'car-2014', 'car-2019', 'car-2025', 'car-2026']);
    expect(plan.projectIds).toHaveLength(5);
    expect(plan.scenes[0]?.from).toBe(0);
  });
  it('en: no narration, so every career entry is a node and the manifest is empty', () => {
    const plan = buildPlan('en');
    expect(plan.careerIds).toHaveLength(6);
    expect(Object.keys(plan.manifest)).toHaveLength(0);
  });
  it('clipSrc names the wav for a manifest key and is null when the clip is missing', () => {
    const ko = buildPlan('ko');
    expect(ko.clip('opening')).toMatch(/^narration\/ko\/opening\.wav$/);
    expect(ko.clip('timeline.car-2013')).toBeNull();
    expect(buildPlan('en').clip('opening')).toBeNull();
  });
});
