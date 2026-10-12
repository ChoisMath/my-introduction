import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { handleUpload, tokenMatches } from './media-upload';

const TOKEN = 'secret-token';
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
let root: string;
beforeEach(() => { root = mkdtempSync(path.join(tmpdir(), 'up-')); });

function put(rel: string, body: Buffer | string, headers: Record<string, string> = {}) {
  return new Request(`http://x/api/media?path=${encodeURIComponent(rel)}`, {
    method: 'PUT',
    body: typeof body === 'string' ? body : new Uint8Array(body),
    headers: { authorization: `Bearer ${TOKEN}`, 'x-content-sha256': sha(body), ...headers },
  });
}

describe('tokenMatches', () => {
  it('accepts only the exact bearer token', () => {
    expect(tokenMatches('Bearer secret-token', TOKEN)).toBe(true);
    expect(tokenMatches('Bearer secret-tokeX', TOKEN)).toBe(false);
    expect(tokenMatches('secret-token', TOKEN)).toBe(false);
    expect(tokenMatches(null, TOKEN)).toBe(false);
    expect(tokenMatches('Bearer ', undefined)).toBe(false);
    expect(tokenMatches('Bearer ', '')).toBe(false);
  });
});

describe('handleUpload', () => {
  const rel = 'media/motion/11-rpg/video.mp4';
  it('stores the file atomically', async () => {
    const r = await handleUpload(root, put(rel, 'hello'), TOKEN);
    expect(r.status).toBe(200);
    expect(readFileSync(path.join(root, rel), 'utf8')).toBe('hello');
    expect(readdirSync(path.join(root, 'media/motion/11-rpg'))).toEqual(['video.mp4']);
  });
  it('401s with a wrong token', async () => {
    const r = await handleUpload(root, put(rel, 'x', { authorization: 'Bearer nope' }), TOKEN);
    expect(r.status).toBe(401);
  });
  it('400s for a path outside the allow list', async () => {
    expect((await handleUpload(root, put('private/other.json', '{}'), TOKEN)).status).toBe(400);
    expect((await handleUpload(root, put('../escape.mp4', 'x'), TOKEN)).status).toBe(400);
  });
  it('413s when the body exceeds the limit', async () => {
    const r = await handleUpload(root, put(rel, Buffer.alloc(32)), TOKEN, 16);
    expect(r.status).toBe(413);
    expect(existsSync(path.join(root, rel))).toBe(false);
  });
  it('keeps the previous file when the sha does not match', async () => {
    mkdirSync(path.join(root, 'media/motion/11-rpg'), { recursive: true });
    writeFileSync(path.join(root, rel), 'old');
    const r = await handleUpload(root, put(rel, 'new', { 'x-content-sha256': sha('other') }), TOKEN);
    expect(r.status).toBe(422);
    expect(readFileSync(path.join(root, rel), 'utf8')).toBe('old');
    expect(readdirSync(path.join(root, 'media/motion/11-rpg'))).toEqual(['video.mp4']);
  });
  it('validates json files against their schema', async () => {
    expect((await handleUpload(root, put('private/motion-admin.json', '[{"id":"x"}]'), TOKEN)).status).toBe(422);
    const admin = JSON.stringify([{ id: '11-rpg', prompt: 'p', ko: 'k', shots: [['a', 'b', 'c']], cues: [['a', 'b', 'c']] }]);
    expect((await handleUpload(root, put('private/motion-admin.json', admin), TOKEN)).status).toBe(200);
    expect((await handleUpload(root, put('media/motion/manifest.json', '{"a":1}'), TOKEN)).status).toBe(422);
  });
  it('validates slide json files and accepts slide images', async () => {
    const bad = '[{"id":"24","prompt":""}]';
    expect((await handleUpload(root, put('private/slide-admin.json', bad), TOKEN)).status).toBe(422);
    const good = '[{"id":"24","prompt":"p"}]';
    expect((await handleUpload(root, put('private/slide-admin.json', good), TOKEN)).status).toBe(200);
    expect((await handleUpload(root, put('media/slide/manifest.json', '{"x":1}'), TOKEN)).status).toBe(422);
    expect((await handleUpload(root, put('media/slide/24/t/1.webp', 'img'), TOKEN)).status).toBe(200);
    expect(readFileSync(path.join(root, 'media/slide/24/t/1.webp'), 'utf8')).toBe('img');
  });
});
