// 원천 school/ 폴더(확정 PDF·프롬프트·공개 문구)를 공개 데이터(git)와 Volume 용 그림·프롬프트(.media-out/)로 나눈다.
// PDF 해시·표지/본문 번호가 그대로인 덱은 다시 래스터화하지 않는다(SD 카드에서 118덱이 40분). 바뀐 그림만 media:push 가 올린다.
// 학교 덱이 아직 없는 스타일은 오빠두 원본(motion/slide 스크랩: data/styles.json + img/)의 예시 그림·프롬프트를 출처와 함께 싣는다(2026-10-28 허락).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { slideAdminListSchema, slidePublicListSchema, slidePublicSchema, type SlideAdmin, type SlidePublic } from '../content/slide/schema';
import { buildSlideManifest, sha256File } from './media/manifest';

export type SchoolEntry = Omit<SlidePublic, 'slides' | 'source'>;
export type DeckInfo = { pages: number; prompt: string };
export type OriginalStyle = Omit<SlidePublic, 'source' | 'topic'> & { prompt: string };

// id 가 그대로 rmSync 경로가 되므로 파일을 건드리기 전에 형식을 확인한다.
export function parseSchoolManifest(raw: unknown): SchoolEntry[] {
  return slidePublicSchema.omit({ slides: true, source: true }).array().parse(raw);
}

// 원본 styles.json 에는 화면에 안 쓰는 필드(sub 등)도 있어 필요한 것만 골라 검사한다.
export function parseOriginalStyles(raw: unknown): OriginalStyle[] {
  return slidePublicSchema.omit({ source: true, topic: true }).extend({ prompt: z.string().min(1) }).strip().array().parse(raw);
}

// 순서: 원본이 있으면 원본의 현재 인기순, 각 자리에 학교 덱이 있으면 학교 덱. 원본 목록에 없는 학교 덱은 뒤에 붙인다.
export function buildSlideData(
  entries: SchoolEntry[],
  decks: Map<string, DeckInfo>,
  originals: OriginalStyle[] = [],
): { publicList: SlidePublic[]; adminList: SlideAdmin[] } {
  const school = new Map(entries.flatMap((e) => {
    const deck = decks.get(e.id);
    return deck ? [[e.id, { public: { ...e, slides: deck.pages, source: 'school' as const }, prompt: deck.prompt.trim() }]] : [];
  }));
  const rows = originals.map((o) => school.get(o.id) ?? {
    public: { id: o.id, no: o.no, family: o.family, name: o.name, look: o.look, use: o.use, slides: o.slides, cover: o.cover, body: o.body, added: o.added, source: 'oppadu' as const },
    prompt: o.prompt.trim(),
  });
  const seen = new Set(originals.map((o) => o.id));
  for (const e of entries) {
    const hit = school.get(e.id);
    if (hit && !seen.has(e.id)) rows.push(hit);
  }
  return {
    publicList: slidePublicListSchema.parse(rows.map((r) => r.public)),
    adminList: slideAdminListSchema.parse(rows.map((r) => ({ id: r.public.id, prompt: r.prompt }))),
  };
}

const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'] });

// SD 카드(exFAT)에서는 macOS 가 남기는 ._ 파일 때문에 재귀 삭제가 ENOTEMPTY 로 한 번씩 실패한다.
const rmTree = (dir: string) => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

async function renderDeck(pdf: string, dir: string, tmp: string, cards: number[]): Promise<number> {
  const stamp = path.join(dir, '.source');
  const key = `${await sha256File(pdf)} ${cards.join(',')}`;
  if (existsSync(stamp)) {
    const [prevKey, pages] = readFileSync(stamp, 'utf8').split('\n');
    if (prevKey === key && Number(pages) > 0) return Number(pages);
  }
  rmTree(dir);
  rmTree(tmp);
  for (const d of [dir, path.join(dir, 's'), path.join(dir, 't'), tmp]) mkdirSync(d, { recursive: true });
  run('pdftoppm', ['-png', '-scale-to-x', '1376', '-scale-to-y', '-1', pdf, path.join(tmp, 'p')]);
  const pngs = readdirSync(tmp)
    .filter((f) => /^p-\d+\.png$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
  pngs.forEach((png, i) => {
    const k = i + 1;
    const src = path.join(tmp, png);
    run('cwebp', ['-quiet', '-q', '82', '-resize', '1376', '768', src, '-o', path.join(dir, `${k}.webp`)]);
    run('cwebp', ['-quiet', '-q', '70', '-resize', '172', '96', src, '-o', path.join(dir, 's', `${k}.webp`)]);
    if (cards.includes(k)) run('cwebp', ['-quiet', '-q', '78', '-resize', '760', '424', src, '-o', path.join(dir, 't', `${k}.webp`)]);
  });
  rmTree(tmp);
  writeFileSync(stamp, `${key}\n${pngs.length}`);
  return pngs.length;
}

// 원본 스크랩의 그림 이름 규칙: img/{id}-{k}.webp(1376×768) · img/s/… · img/t/…(표지·본문만). 하나라도 없으면 그 스타일은 싣지 않는다.
function copyOriginal(imgDir: string, s: OriginalStyle, dir: string): boolean {
  const pairs: [string, string][] = [];
  for (let k = 1; k <= s.slides; k++) {
    pairs.push([path.join(imgDir, `${s.id}-${k}.webp`), path.join(dir, `${k}.webp`)]);
    pairs.push([path.join(imgDir, 's', `${s.id}-${k}.webp`), path.join(dir, 's', `${k}.webp`)]);
  }
  for (const k of new Set([s.cover, s.body])) pairs.push([path.join(imgDir, 't', `${s.id}-${k}.webp`), path.join(dir, 't', `${k}.webp`)]);
  const missing = pairs.filter(([src]) => !existsSync(src));
  if (missing.length) {
    console.warn(`skip original ${s.id}: ${missing.length} image(s) missing`);
    return false;
  }
  rmTree(dir);
  for (const d of [dir, path.join(dir, 's'), path.join(dir, 't')]) mkdirSync(d, { recursive: true });
  // copyFileSync(APFS 복제)가 이 SD 카드에서 EILSEQ 로 실패한 적이 있어 읽어서 쓴다.
  for (const [src, dest] of pairs) writeFileSync(dest, readFileSync(src));
  return true;
}

async function main() {
  const src = process.env.SLIDE_SRC ?? '/Volumes/Chois_SD2/dev/motion/slide/school';
  const out = path.resolve('.media-out');
  const entries = parseSchoolManifest(JSON.parse(readFileSync(path.join(src, 'manifest.json'), 'utf8')));
  const decks = new Map<string, DeckInfo>();
  for (const e of entries) {
    const pdf = path.join(src, e.id, 'deck.pdf');
    if (!existsSync(pdf)) {
      console.warn(`skip ${e.id}: deck.pdf missing`);
      continue;
    }
    const pages = await renderDeck(pdf, path.join(out, 'media/slide', e.id), path.join(out, '.tmp-slide'), [e.cover, e.body]);
    decks.set(e.id, { pages, prompt: readFileSync(path.join(src, e.id, 'prompt.txt'), 'utf8') });
    console.info(`rendered ${e.id}: ${pages} pages`);
  }
  const originalSrc = process.env.OPPADU_SLIDE_SRC ?? path.resolve(src, '..');
  const originals = parseOriginalStyles(JSON.parse(readFileSync(path.join(originalSrc, 'data/styles.json'), 'utf8')).styles)
    .filter((o) => decks.has(o.id) || copyOriginal(path.join(originalSrc, 'img'), o, path.join(out, 'media/slide', o.id)));
  console.info(`originals ${originals.length} (school decks replace ${originals.filter((o) => decks.has(o.id)).length})`);
  const { publicList, adminList } = buildSlideData(entries, decks, originals);
  writeFileSync(path.resolve('content/slide/public.json'), JSON.stringify(publicList, null, 1) + '\n');
  mkdirSync(path.join(out, 'private'), { recursive: true });
  writeFileSync(path.join(out, 'private/slide-admin.json'), JSON.stringify(adminList, null, 1) + '\n');
  const manifest = await buildSlideManifest(out);
  writeFileSync(path.join(out, 'media/slide/manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  console.info(`public ${publicList.length} · manifest ${Object.keys(manifest).length} files`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
