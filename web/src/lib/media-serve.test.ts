import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { serveMedia } from './media-serve';

let root: string;
const rel = 'media/motion/11-rpg/video.mp4';
const bytes = Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256));

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'vol-'));
  mkdirSync(path.join(root, 'media/motion/11-rpg'), { recursive: true });
  writeFileSync(path.join(root, rel), bytes);
  mkdirSync(path.join(root, 'private'), { recursive: true });
  writeFileSync(path.join(root, 'private/motion-admin.json'), '[]');
});

const req = (headers: Record<string, string> = {}, method = 'GET') => new Request('http://x/' + rel, { headers, method });

describe('serveMedia', () => {
  it('returns the whole file with range support headers', async () => {
    const r = await serveMedia(root, rel, req());
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('video/mp4');
    expect(r.headers.get('accept-ranges')).toBe('bytes');
    expect(r.headers.get('content-length')).toBe('1000');
    expect(Buffer.from(await r.arrayBuffer()).equals(bytes)).toBe(true);
  });
  it('returns 206 with the requested slice', async () => {
    const r = await serveMedia(root, rel, req({ range: 'bytes=10-19' }));
    expect(r.status).toBe(206);
    expect(r.headers.get('content-range')).toBe('bytes 10-19/1000');
    expect(r.headers.get('content-length')).toBe('10');
    expect(Buffer.from(await r.arrayBuffer()).equals(bytes.subarray(10, 20))).toBe(true);
  });
  it('returns 416 for a start past the end', async () => {
    const r = await serveMedia(root, rel, req({ range: 'bytes=5000-' }));
    expect(r.status).toBe(416);
    expect(r.headers.get('content-range')).toBe('bytes */1000');
    expect(r.headers.get('cache-control')).toBeNull();
    expect(r.headers.get('etag')).toBeNull();
  });
  it('answers HEAD without a body', async () => {
    const r = await serveMedia(root, rel, req({}, 'HEAD'));
    expect(r.status).toBe(200);
    expect(r.headers.get('content-length')).toBe('1000');
    expect(r.body).toBeNull();
  });
  it('404s for missing files and non-servable paths', async () => {
    expect((await serveMedia(root, 'media/motion/02-comics/video.mp4', req())).status).toBe(404);
    expect((await serveMedia(root, 'private/motion-admin.json', req())).status).toBe(404);
    expect((await serveMedia(root, 'media/motion/../../private/motion-admin.json', req())).status).toBe(404);
  });
});
