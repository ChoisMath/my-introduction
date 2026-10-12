import 'server-only';
import path from 'node:path';

export class VolumeError extends Error {}

export const MANIFEST_PATH = 'media/motion/manifest.json';
export const ADMIN_PATH = 'private/motion-admin.json';
export const SLIDE_MANIFEST_PATH = 'media/slide/manifest.json';
export const SLIDE_ADMIN_PATH = 'private/slide-admin.json';

const SERVABLE = [
  /^media\/motion\/\d{2}-[a-z0-9-]+\/(video\.mp4|preview\.mp4|poster\.webp)$/,
  /^media\/slide\/\d{2,3}\/(?:[st]\/)?\d{1,2}\.webp$/,
];
const UPLOADABLE_JSON = [MANIFEST_PATH, ADMIN_PATH, SLIDE_MANIFEST_PATH, SLIDE_ADMIN_PATH];

export function volumeRoot(): string {
  const root = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  if (!root) throw new VolumeError('RAILWAY_VOLUME_MOUNT_PATH is not set');
  // standalone 서버는 server.js 폴더로 chdir 하므로 상대경로는 엉뚱한 곳을 가리킨다.
  if (process.env.NODE_ENV === 'production' && !path.isAbsolute(root)) throw new VolumeError('RAILWAY_VOLUME_MOUNT_PATH must be absolute in production');
  return path.resolve(root);
}

export function isServablePath(rel: string): boolean {
  return SERVABLE.some((re) => re.test(rel));
}

export function isUploadablePath(rel: string): boolean {
  return isServablePath(rel) || UPLOADABLE_JSON.includes(rel);
}

export function resolveIn(root: string, rel: string): string {
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(path.resolve(root) + path.sep)) throw new VolumeError(`path escapes the volume: ${rel}`);
  return abs;
}
