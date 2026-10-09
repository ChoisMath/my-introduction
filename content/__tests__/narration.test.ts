import { describe, expect, it } from 'vitest';
import { getContent, getNarration, narrationKeys } from '../index';

describe('narration script', () => {
  const n = getNarration('ko');
  it('exists for ko and is null for en', () => {
    expect(n).not.toBeNull();
    expect(getNarration('en')).toBeNull();
  });
  it('refers only to real career and project ids', () => {
    const { profile, projects } = getContent('ko');
    const careerIds = new Set(profile.career.map((c) => c.id));
    for (const id of Object.keys(n!.timeline)) expect(careerIds.has(id), id).toBe(true);
    for (const id of Object.keys(n!.projects)) expect(projects.some((p) => p.id === id), id).toBe(true);
  });
  it('uses Hangul spellings the TTS can read (no Latin product names)', () => {
    for (const { key, text } of narrationKeys(n!)) expect(text, key).not.toMatch(/GeoGebra|Python|Next\.js/);
  });
  it('flattens to one clip per sentence group with dotted keys', () => {
    const keys = narrationKeys(n!).map((k) => k.key);
    expect(keys).toContain('timeline.car-2012');
    expect(keys).toContain('projects.mathcoach');
    expect(keys[0]).toBe('opening');
    expect(keys[keys.length - 1]).toBe('ending');
  });
});
