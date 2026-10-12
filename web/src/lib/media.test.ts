import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { MediaManifest, MotionPublic } from '@me/content';
import { getRenderedMotions, mediaUrl, readManifest, renderedMotions } from './media';

const entry = (c: string) => ({ size: 1, sha256: c.repeat(64), updatedAt: '2026-10-12T00:00:00.000Z' });
const manifest: MediaManifest = {
  'media/motion/01-pixel/video.mp4': entry('a'),
  'media/motion/01-pixel/poster.webp': entry('b'),
  'media/motion/01-pixel/preview.mp4': entry('c'),
  'media/motion/02-comics/video.mp4': entry('d'),
};
const item = (id: string, no: number, featured = false): MotionPublic => ({ id, no, group: '게임·만화', name: id, en: id, use: 'u', concept: 'c', featured });

describe('mediaUrl', () => {
  it('builds a versioned url', () => expect(mediaUrl(manifest, '01-pixel', 'video')).toBe('/media/motion/01-pixel/video.mp4?v=aaaaaaaa'));
  it('returns null for a missing file', () => expect(mediaUrl(manifest, '03-paper-app', 'poster')).toBeNull());
});

describe('renderedMotions', () => {
  it('keeps only items with both video and poster', () => {
    const out = renderedMotions([item('01-pixel', 1), item('02-comics', 2), item('03-paper-app', 3)], manifest);
    expect(out.map((m) => m.id)).toEqual(['01-pixel']);
    expect(out[0]).toMatchObject({ poster: '/media/motion/01-pixel/poster.webp?v=bbbbbbbb', preview: '/media/motion/01-pixel/preview.mp4?v=cccccccc' });
  });
  it('returns [] when manifest is missing', () => expect(renderedMotions([item('01-pixel', 1)], null)).toEqual([]));
});

describe('getRenderedMotions', () => {
  it('returns [] when the volume is not configured', async () => {
    const saved = process.env.RAILWAY_VOLUME_MOUNT_PATH;
    delete process.env.RAILWAY_VOLUME_MOUNT_PATH;
    try {
      expect(await getRenderedMotions()).toEqual([]);
    } finally {
      if (saved === undefined) delete process.env.RAILWAY_VOLUME_MOUNT_PATH;
      else process.env.RAILWAY_VOLUME_MOUNT_PATH = saved;
    }
  });
});

describe('readManifest', () => {
  it('returns null when the file is missing or invalid', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'mf-'));
    expect(await readManifest(root)).toBeNull();
    mkdirSync(path.join(root, 'media/motion'), { recursive: true });
    writeFileSync(path.join(root, 'media/motion/manifest.json'), '{"x":1}');
    expect(await readManifest(root)).toBeNull();
  });
  it('parses a valid manifest', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'mf-'));
    mkdirSync(path.join(root, 'media/motion'), { recursive: true });
    writeFileSync(path.join(root, 'media/motion/manifest.json'), JSON.stringify(manifest));
    expect(await readManifest(root)).toEqual(manifest);
  });
});
