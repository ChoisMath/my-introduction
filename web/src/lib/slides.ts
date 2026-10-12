import 'server-only';
import { readFile, stat } from 'node:fs/promises';
import { getSlideList, slideAdminListSchema, type MediaManifest, type SlideAdmin, type SlidePublic } from '@me/content';
import { readManifest } from './media';
import { SLIDE_ADMIN_PATH, SLIDE_MANIFEST_PATH, resolveIn, volumeRoot } from './volume';

export type SlideCardData = SlidePublic & { images: string[]; thumbs: string[]; coverCard: string; bodyCard: string };
type Size = 'full' | 's' | 't';

export function slideRel(id: string, k: number, size: Size): string {
  return size === 'full' ? `media/slide/${id}/${k}.webp` : `media/slide/${id}/${size}/${k}.webp`;
}

function versioned(manifest: MediaManifest, rel: string): string | null {
  const entry = manifest[rel];
  return entry ? `/${rel}?v=${entry.sha256.slice(0, 8)}` : null;
}

export function renderedSlides(list: SlidePublic[], manifest: MediaManifest | null): SlideCardData[] {
  if (!manifest) return [];
  return list.flatMap((s) => {
    const ks = Array.from({ length: s.slides }, (_, i) => i + 1);
    const images = ks.map((k) => versioned(manifest, slideRel(s.id, k, 'full')));
    const thumbs = ks.map((k) => versioned(manifest, slideRel(s.id, k, 's')));
    const coverCard = versioned(manifest, slideRel(s.id, s.cover, 't'));
    const bodyCard = versioned(manifest, slideRel(s.id, s.body, 't'));
    if (!coverCard || !bodyCard || images.some((u) => !u) || thumbs.some((u) => !u)) return [];
    return [{ ...s, images: images as string[], thumbs: thumbs as string[], coverCard, bodyCard }];
  });
}

export async function getRenderedSlides(): Promise<SlideCardData[]> {
  let root: string;
  try {
    root = volumeRoot();
  } catch (error) {
    console.error('[slides]', error);
    return [];
  }
  return renderedSlides(getSlideList(), await readManifest(root, SLIDE_MANIFEST_PATH));
}

const adminCache = new Map<string, { mtimeMs: number; list: SlideAdmin[] }>();

export async function readSlideAdmin(root: string): Promise<SlideAdmin[] | null> {
  const file = resolveIn(root, SLIDE_ADMIN_PATH);
  let mtimeMs: number;
  try {
    mtimeMs = (await stat(file)).mtimeMs;
  } catch {
    console.error('[slides] admin data missing', file);
    return null;
  }
  const hit = adminCache.get(file);
  if (hit?.mtimeMs === mtimeMs) return hit.list;
  try {
    const list = slideAdminListSchema.parse(JSON.parse(await readFile(file, 'utf8')));
    adminCache.set(file, { mtimeMs, list });
    return list;
  } catch (error) {
    console.error('[slides] invalid admin data', error);
    return null;
  }
}
