import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { MediaManifest, SlidePublic } from '@me/content';
import { readSlideAdmin, renderedSlides, slideRel } from './slides';

const deck: SlidePublic = { id: '24', no: 24, family: 'hand', name: 'n', look: 'l', use: 'u', topic: 't', slides: 3, cover: 1, body: 2, added: '2026-10-12' };
const entry = { size: 1, sha256: 'a'.repeat(64), updatedAt: 'x' };
const full = (d: SlidePublic): MediaManifest => Object.fromEntries([
  ...Array.from({ length: d.slides }, (_, i) => [slideRel(d.id, i + 1, 'full'), entry]),
  ...Array.from({ length: d.slides }, (_, i) => [slideRel(d.id, i + 1, 's'), entry]),
  [slideRel(d.id, d.cover, 't'), entry],
  [slideRel(d.id, d.body, 't'), entry],
]);

describe('renderedSlides', () => {
  it('builds versioned urls for every slide', () => {
    const [card] = renderedSlides([deck], full(deck));
    expect(card?.images).toEqual(['/media/slide/24/1.webp?v=aaaaaaaa', '/media/slide/24/2.webp?v=aaaaaaaa', '/media/slide/24/3.webp?v=aaaaaaaa']);
    expect(card?.thumbs[0]).toBe('/media/slide/24/s/1.webp?v=aaaaaaaa');
    expect(card?.coverCard).toBe('/media/slide/24/t/1.webp?v=aaaaaaaa');
    expect(card?.bodyCard).toBe('/media/slide/24/t/2.webp?v=aaaaaaaa');
  });
  it('drops a deck with any missing file instead of showing a broken image', () => {
    for (const rel of [slideRel('24', 3, 'full'), slideRel('24', 2, 's'), slideRel('24', 2, 't')]) {
      const m = full(deck);
      delete m[rel];
      expect(renderedSlides([deck], m), rel).toEqual([]);
    }
    expect(renderedSlides([deck], null)).toEqual([]);
  });
});

describe('readSlideAdmin', () => {
  const root = () => mkdtempSync(path.join(os.tmpdir(), 'slide-admin-'));
  it('returns null when the file is missing or invalid', async () => {
    expect(await readSlideAdmin(root())).toBeNull();
    const r = root();
    mkdirSync(path.join(r, 'private'));
    writeFileSync(path.join(r, 'private/slide-admin.json'), '[{"id":"24"}]');
    expect(await readSlideAdmin(r)).toBeNull();
  });
  it('parses a valid file', async () => {
    const r = root();
    mkdirSync(path.join(r, 'private'));
    writeFileSync(path.join(r, 'private/slide-admin.json'), '[{"id":"24","prompt":"p"}]');
    expect(await readSlideAdmin(r)).toEqual([{ id: '24', prompt: 'p' }]);
  });
});
