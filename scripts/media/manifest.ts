import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { mediaManifestSchema, type MediaManifest } from '../../content/motion/schema';

const MEDIA_FILES = ['video.mp4', 'preview.mp4', 'poster.webp'] as const;

export async function sha256File(file: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

export async function buildManifest(root: string): Promise<MediaManifest> {
  const base = path.join(root, 'media/motion');
  const ids = existsSync(base) ? (await readdir(base, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name) : [];
  const out: MediaManifest = {};
  for (const id of ids.sort()) {
    for (const name of MEDIA_FILES) {
      const file = path.join(base, id, name);
      if (!existsSync(file)) continue;
      const info = await stat(file);
      out[`media/motion/${id}/${name}`] = { size: info.size, sha256: await sha256File(file), updatedAt: info.mtime.toISOString() };
    }
  }
  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  return mediaManifestSchema.parse(sorted);
}

export function diffManifest(local: MediaManifest, remote: MediaManifest): string[] {
  return Object.keys(local).filter((k) => remote[k]?.sha256 !== local[k]?.sha256).sort();
}

// slide 는 덱마다 장 수가 달라 파일 이름을 정해 둘 수 없으므로 media/slide 아래 webp 를 모두 훑는다.
export async function buildSlideManifest(root: string): Promise<MediaManifest> {
  const base = path.join(root, 'media/slide');
  if (!existsSync(base)) return {};
  const entries = await readdir(base, { recursive: true, withFileTypes: true });
  const out: MediaManifest = {};
  for (const d of entries.filter((e) => e.isFile() && e.name.endsWith('.webp'))) {
    const file = path.join(d.parentPath, d.name);
    const rel = path.relative(root, file).split(path.sep).join('/');
    const info = await stat(file);
    out[rel] = { size: info.size, sha256: await sha256File(file), updatedAt: info.mtime.toISOString() };
  }
  return mediaManifestSchema.parse(Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b))));
}
