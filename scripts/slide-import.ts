// 원천 school/ 폴더(확정 PDF·프롬프트·공개 문구)를 공개 데이터(git)와 Volume 용 그림·프롬프트(.media-out/)로 나눈다.
// 덱이 7–150개 수준이라 매번 다시 래스터화한다. cwebp·pdftoppm 출력이 결정적이라 바뀌지 않은 그림은 media:push 가 건너뛴다.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { slideAdminListSchema, slidePublicListSchema, type SlideAdmin, type SlidePublic } from '../content/slide/schema';
import { buildSlideManifest } from './media/manifest';

export type SchoolEntry = Omit<SlidePublic, 'slides'>;
export type DeckInfo = { pages: number; prompt: string };

export function buildSlideData(entries: SchoolEntry[], decks: Map<string, DeckInfo>): { publicList: SlidePublic[]; adminList: SlideAdmin[] } {
  const ready = entries.flatMap((e) => {
    const deck = decks.get(e.id);
    return deck ? [{ entry: e, deck }] : [];
  });
  return {
    publicList: slidePublicListSchema.parse(ready.map(({ entry, deck }) => ({ ...entry, slides: deck.pages }))),
    adminList: slideAdminListSchema.parse(ready.map(({ entry, deck }) => ({ id: entry.id, prompt: deck.prompt.trim() }))),
  };
}

const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'] });

function renderDeck(pdf: string, dir: string, tmp: string, cards: number[]): number {
  rmSync(dir, { recursive: true, force: true });
  rmSync(tmp, { recursive: true, force: true });
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
  rmSync(tmp, { recursive: true, force: true });
  return pngs.length;
}

async function main() {
  const src = process.env.SLIDE_SRC ?? '/Volumes/Chois_SD2/dev/motion/slide/school';
  const out = path.resolve('.media-out');
  const entries = JSON.parse(readFileSync(path.join(src, 'manifest.json'), 'utf8')) as SchoolEntry[];
  const decks = new Map<string, DeckInfo>();
  for (const e of entries) {
    const pdf = path.join(src, e.id, 'deck.pdf');
    if (!existsSync(pdf)) {
      console.warn(`skip ${e.id}: deck.pdf missing`);
      continue;
    }
    const pages = renderDeck(pdf, path.join(out, 'media/slide', e.id), path.join(out, '.tmp-slide'), [e.cover, e.body]);
    decks.set(e.id, { pages, prompt: readFileSync(path.join(src, e.id, 'prompt.txt'), 'utf8') });
    console.info(`rendered ${e.id}: ${pages} pages`);
  }
  const { publicList, adminList } = buildSlideData(entries, decks);
  writeFileSync(path.resolve('content/slide/public.json'), JSON.stringify(publicList, null, 1) + '\n');
  mkdirSync(path.join(out, 'private'), { recursive: true });
  writeFileSync(path.join(out, 'private/slide-admin.json'), JSON.stringify(adminList, null, 1) + '\n');
  const manifest = await buildSlideManifest(out);
  writeFileSync(path.join(out, 'media/slide/manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  console.info(`public ${publicList.length} · manifest ${Object.keys(manifest).length} files`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
