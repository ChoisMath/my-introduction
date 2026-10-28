// 로컬 motion 폴더의 Chois판 데이터(data/chois-gallery.json)를 공개/관리자 두 파일로 나눈다.
// 공개분만 git 에 들어가고, 관리자분은 .media-out/ 에 두었다가 media:push 로 Volume 에만 올린다.
// Chois판이 없는 편은 오빠두 원본(data/oppadu-v2/gallery.json — motion 폴더 build-oppadu-v2.cjs 산출물)을 출처와 함께 싣는다(2026-10-28 허락).
// 원본 프롬프트는 v2 틀이라 사이트 빈칸 문법과 달라, 빌드가 미리 채운 완성본(final)을 prompt/ko 로 쓴다.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { motionAdminListSchema, motionPublicListSchema, type MotionAdmin, type MotionPublic, type MotionGroup } from '../content/motion/schema';

export type SourceItem = {
  id: string; no: string; g: string; name: string; use: string; en: string; concept: string;
  prompt: string; ko: string; shots: [string, string, string][]; cues: [string, string, string][];
};

export type OriginalItem = {
  id: string; no: string; g: string; name: string; use: string; en: string; concept: string;
  final: { en: string; ko: string }; shots: [string, string, string][]; cues: [string, string, string][];
};

const FEATURED_IDS = ['01-pixel', '06-neon', '11-rpg', '13-manga', '17-embroidery', '19-chalkboard'] as const;

export function splitGallery(items: SourceItem[], featured: readonly string[], originals: OriginalItem[] = []): { publicList: MotionPublic[]; adminList: MotionAdmin[] } {
  const own = new Set(items.map((i) => i.id));
  const rest = originals.filter((o) => !own.has(o.id));
  const meta = (i: SourceItem | OriginalItem) => ({
    id: i.id, no: Number(i.no), group: i.g as MotionGroup, name: i.name, en: i.en, use: i.use, concept: i.concept,
    featured: featured.includes(i.id),
  });
  const publicList = motionPublicListSchema.parse([
    ...items.map((i) => ({ ...meta(i), source: 'chois' as const })),
    ...rest.map((o) => ({ ...meta(o), source: 'oppadu' as const })),
  ]);
  const adminList = motionAdminListSchema.parse([
    ...items.map((i) => ({ id: i.id, prompt: i.prompt, ko: i.ko, shots: i.shots, cues: i.cues })),
    ...rest.map((o) => ({ id: o.id, prompt: o.final.en, ko: o.final.ko, shots: o.shots, cues: o.cues })),
  ]);
  return { publicList, adminList };
}

function main() {
  const src = process.env.MOTION_SRC ?? '/Volumes/Chois_SD2/dev/motion';
  const gallery = JSON.parse(readFileSync(path.join(src, 'data/chois-gallery.json'), 'utf8')) as { items: SourceItem[] };
  const originals = JSON.parse(readFileSync(path.join(src, 'data/oppadu-v2/gallery.json'), 'utf8')) as { items: OriginalItem[] };
  const { publicList, adminList } = splitGallery(gallery.items, FEATURED_IDS, originals.items);
  writeFileSync(path.resolve('content/motion/public.json'), JSON.stringify(publicList, null, 1) + '\n');
  const adminFile = path.resolve('.media-out/private/motion-admin.json');
  mkdirSync(path.dirname(adminFile), { recursive: true });
  writeFileSync(adminFile, JSON.stringify(adminList));
  console.info(`motion:import public=${publicList.length} admin=${adminList.length} → ${adminFile}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
