import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildManifest, diffManifest } from '../media/manifest';

const e = (c: string) => ({ size: 1, sha256: c.repeat(64), updatedAt: 't' });

describe('diffManifest', () => {
  it('lists new and changed files only', () => {
    const local = { 'a.mp4': e('a'), 'b.mp4': e('b'), 'c.mp4': e('c') };
    const remote = { 'a.mp4': e('a'), 'b.mp4': e('x') };
    expect(diffManifest(local, remote)).toEqual(['b.mp4', 'c.mp4']);
  });
  it('is empty when identical', () => expect(diffManifest({ 'a.mp4': e('a') }, { 'a.mp4': e('a') })).toEqual([]));
});

describe('buildManifest', () => {
  it('hashes known media files and ignores others', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'bm-'));
    const dir = path.join(root, 'media/motion/11-rpg');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'video.mp4'), 'v');
    writeFileSync(path.join(dir, 'poster.webp'), 'p');
    writeFileSync(path.join(dir, '.source-sha256'), 'x');
    const m = await buildManifest(root);
    expect(Object.keys(m)).toEqual(['media/motion/11-rpg/poster.webp', 'media/motion/11-rpg/video.mp4']);
    expect(m['media/motion/11-rpg/video.mp4']).toMatchObject({ size: 1, sha256: createHash('sha256').update('v').digest('hex') });
  });
});
