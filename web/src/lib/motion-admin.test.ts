import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readMotionAdmin } from './motion-admin';

const item = { id: '11-rpg', prompt: 'p', ko: 'k', shots: [['a', 'b', 'c']], cues: [['a', 'b', 'c']] };

describe('readMotionAdmin', () => {
  it('returns null when missing or invalid', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'ad-'));
    expect(await readMotionAdmin(root)).toBeNull();
    mkdirSync(path.join(root, 'private'));
    writeFileSync(path.join(root, 'private/motion-admin.json'), '[{"id":1}]');
    expect(await readMotionAdmin(root)).toBeNull();
  });
  it('parses a valid file', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'ad-'));
    mkdirSync(path.join(root, 'private'));
    writeFileSync(path.join(root, 'private/motion-admin.json'), JSON.stringify([item]));
    expect(await readMotionAdmin(root)).toEqual([item]);
  });
});
