import 'server-only';
import path from 'node:path';

export class VolumeError extends Error {}

export const MANIFEST_PATH = 'media/motion/manifest.json';
export const ADMIN_PATH = 'private/motion-admin.json';

const SERVABLE = /^media\/motion\/\d{2}-[a-z0-9-]+\/(video\.mp4|preview\.mp4|poster\.webp)$/;

export function volumeRoot(): string {
  const root = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  if (!root) throw new VolumeError('RAILWAY_VOLUME_MOUNT_PATH is not set');
  // standalone 서버는 server.js 폴더로 chdir 하므로 상대경로는 엉뚱한 곳을 가리킨다.
  if (process.env.NODE_ENV === 'production' && !path.isAbsolute(root)) throw new VolumeError('RAILWAY_VOLUME_MOUNT_PATH must be absolute in production');
  return path.resolve(root);
}

export function isServablePath(rel: string): boolean {
  return SERVABLE.test(rel);
}

export function isUploadablePath(rel: string): boolean {
  return SERVABLE.test(rel) || rel === MANIFEST_PATH || rel === ADMIN_PATH;
}

export function resolveIn(root: string, rel: string): string {
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(path.resolve(root) + path.sep)) throw new VolumeError(`path escapes the volume: ${rel}`);
  return abs;
}
