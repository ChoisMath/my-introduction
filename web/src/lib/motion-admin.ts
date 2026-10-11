import 'server-only';
import { readFile, stat } from 'node:fs/promises';
import { motionAdminListSchema, type MotionAdmin } from '@me/content';
import { ADMIN_PATH, resolveIn } from './volume';

const cache = new Map<string, { mtimeMs: number; list: MotionAdmin[] }>();

export async function readMotionAdmin(root: string): Promise<MotionAdmin[] | null> {
  const file = resolveIn(root, ADMIN_PATH);
  let mtimeMs: number;
  try {
    mtimeMs = (await stat(file)).mtimeMs;
  } catch {
    console.error('[motion-admin] admin data missing', file);
    return null;
  }
  const hit = cache.get(file);
  if (hit?.mtimeMs === mtimeMs) return hit.list;
  try {
    const list = motionAdminListSchema.parse(JSON.parse(await readFile(file, 'utf8')));
    cache.set(file, { mtimeMs, list });
    return list;
  } catch (error) {
    console.error('[motion-admin] invalid admin data', error);
    return null;
  }
}
