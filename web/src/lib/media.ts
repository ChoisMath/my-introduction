import 'server-only';
import { readFile, stat } from 'node:fs/promises';
import { getMotionList, mediaManifestSchema, type MediaManifest, type MotionPublic } from '@me/content';
import { MANIFEST_PATH, resolveIn, volumeRoot } from './volume';

export type MediaKind = 'video' | 'preview' | 'poster';
export type MotionCardData = MotionPublic & { video: string; poster: string; preview: string | null };

const FILES: Record<MediaKind, string> = { video: 'video.mp4', preview: 'preview.mp4', poster: 'poster.webp' };

export function mediaRel(id: string, kind: MediaKind): string {
  return `media/motion/${id}/${FILES[kind]}`;
}

// 요청마다 렌더하므로 manifest 는 mtime 이 바뀔 때만 다시 읽는다.
const cache = new Map<string, { mtimeMs: number; manifest: MediaManifest }>();

export async function readManifest(root: string, rel: string = MANIFEST_PATH): Promise<MediaManifest | null> {
  const file = resolveIn(root, rel);
  let mtimeMs: number;
  try {
    mtimeMs = (await stat(file)).mtimeMs;
  } catch {
    return null;
  }
  const hit = cache.get(file);
  if (hit?.mtimeMs === mtimeMs) return hit.manifest;
  try {
    const manifest = mediaManifestSchema.parse(JSON.parse(await readFile(file, 'utf8')));
    cache.set(file, { mtimeMs, manifest });
    return manifest;
  } catch (error) {
    console.error('[media] invalid manifest', error);
    return null;
  }
}

export function mediaUrl(manifest: MediaManifest, id: string, kind: MediaKind): string | null {
  const rel = mediaRel(id, kind);
  const entry = manifest[rel];
  return entry ? `/${rel}?v=${entry.sha256.slice(0, 8)}` : null;
}

export function renderedMotions(list: MotionPublic[], manifest: MediaManifest | null): MotionCardData[] {
  if (!manifest) return [];
  return list.flatMap((m) => {
    const video = mediaUrl(manifest, m.id, 'video');
    const poster = mediaUrl(manifest, m.id, 'poster');
    return video && poster ? [{ ...m, video, poster, preview: mediaUrl(manifest, m.id, 'preview') }] : [];
  });
}

export async function getRenderedMotions(): Promise<MotionCardData[]> {
  let root: string;
  try {
    root = volumeRoot();
  } catch (error) {
    console.error('[media]', error);
    return [];
  }
  return renderedMotions(getMotionList(), await readManifest(root));
}

export function pickFeatured(items: MotionCardData[], n = 6): MotionCardData[] {
  return [...items.filter((m) => m.featured), ...items.filter((m) => !m.featured)].slice(0, n);
}
