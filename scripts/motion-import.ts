// 로컬 motion 폴더의 Chois판 데이터(data/chois-gallery.json)를 공개/관리자 두 파일로 나눈다.
// 공개분만 git 에 들어가고, 관리자분은 .media-out/ 에 두었다가 media:push 로 Volume 에만 올린다.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { motionAdminListSchema, motionPublicListSchema, type MotionAdmin, type MotionPublic, type MotionGroup } from '../content/motion/schema';

export type SourceItem = {
  id: string; no: string; g: string; name: string; use: string; en: string; concept: string;
  prompt: string; ko: string; shots: [string, string, string][]; cues: [string, string, string][];
};

const FEATURED_IDS = ['01-pixel', '06-neon', '11-rpg', '13-manga', '17-embroidery', '19-chalkboard'] as const;

export function splitGallery(items: SourceItem[], featured: readonly string[]): { publicList: MotionPublic[]; adminList: MotionAdmin[] } {
  const publicList = motionPublicListSchema.parse(items.map((i) => ({
    id: i.id, no: Number(i.no), group: i.g as MotionGroup, name: i.name, en: i.en, use: i.use, concept: i.concept,
    featured: featured.includes(i.id),
  })));
  const adminList = motionAdminListSchema.parse(items.map((i) => ({ id: i.id, prompt: i.prompt, ko: i.ko, shots: i.shots, cues: i.cues })));
  return { publicList, adminList };
}

function main() {
  const src = process.env.MOTION_SRC ?? '/Volumes/Chois_SD2/dev/motion';
  const gallery = JSON.parse(readFileSync(path.join(src, 'data/chois-gallery.json'), 'utf8')) as { items: SourceItem[] };
  const { publicList, adminList } = splitGallery(gallery.items, FEATURED_IDS);
  writeFileSync(path.resolve('content/motion/public.json'), JSON.stringify(publicList, null, 1) + '\n');
  const adminFile = path.resolve('.media-out/private/motion-admin.json');
  mkdirSync(path.dirname(adminFile), { recursive: true });
  writeFileSync(adminFile, JSON.stringify(adminList));
  console.info(`motion:import public=${publicList.length} admin=${adminList.length} → ${adminFile}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
