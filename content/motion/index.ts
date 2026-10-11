import raw from './public.json';
import { motionPublicListSchema, type MotionPublic } from './schema';

export * from './schema';

let list: MotionPublic[] | null = null;

export function getMotionList(): MotionPublic[] {
  list ??= motionPublicListSchema.parse(raw).sort((a, b) => a.no - b.no);
  return list;
}

export function getMotion(id: string): MotionPublic | null {
  return getMotionList().find((m) => m.id === id) ?? null;
}
