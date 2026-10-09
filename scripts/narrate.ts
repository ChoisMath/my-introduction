// content/<locale>/narration.json → video/public/narration/<locale>/<key>.wav + manifest.json (길이·대본).
// 사용: npm run narrate [-- ko|en] [--force] [--only=<key>]  (기본 ko, --force 는 대본이 같아도 재생성)
// Qwen3-TTS(mlx-audio) 에 Voicebox "Chois" 프로필의 참조 음성(video/narration/ref, git 제외)을 붙여 목소리를 복제한다.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getNarration, locales, narrationKeys, type Locale } from '../content/index';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const refAudio = path.join(root, 'video/narration/ref/chois.wav');
const refText = path.join(root, 'video/narration/ref/chois.txt');
const localeArg = process.argv[2] ?? 'ko';
if (!(locales as readonly string[]).includes(localeArg)) { console.error(`unknown locale: ${localeArg}`); process.exit(1); }
const locale = localeArg as Locale;
const outDir = path.join(root, `video/public/narration/${locale}`);
const manifestPath = path.join(outDir, 'manifest.json');
const tts = process.env.MLX_TTS ?? '/Volumes/Chois_SD2/venvs/mlx-audio/bin/mlx_audio.tts.generate';
const model = process.env.TTS_MODEL ?? 'mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16';

type Manifest = Record<string, { text: string; duration: number }>;

if (!existsSync(refAudio) || !existsSync(refText)) {
  console.error(`reference voice missing: ${refAudio} / ${refText}`);
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
const manifest: Manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf-8')) : {};
const narration = getNarration(locale);
if (!narration) throw new Error(`no ${locale} narration`);

const duration = (file: string) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]).toString().trim());

// Qwen3-TTS 는 마지막 음절 도중(EOS)에서 생성을 멈춰 문장 끝이 뭉개지거나 딱 끊긴다.
// 뒤에 더미 문장을 붙여 생성하면 본문이 자연스럽게 끝나고 짧은 쉼이 생기므로, 그 쉼에서 잘라낸다.
const TAIL: Record<Locale, string> = { ko: '감사합니다.', en: 'Thank you.' };
const TAKES = 3;
const GAP_DB = -40;
const GAP_MIN = 0.08;
const KEEP_INTO_GAP = 0.06;
const FADE_OUT = 0.05;
const PAD_AFTER = 0.45;
const force = process.argv.includes('--force');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);

type Gap = { start: number; end: number };
const silenceGaps = (file: string): Gap[] => {
  // ffmpeg 필터 로그는 stderr 로 나온다.
  const log = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `silencedetect=n=${GAP_DB}dB:d=${GAP_MIN}`, '-f', 'null', '-'], { encoding: 'utf-8' }).stderr;
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  return starts.map((start, i) => ({ start, end: ends[i] ?? Infinity }));
};
// 더미 문장 앞의 쉼: 마지막 무음 구간이어야 하고(더미 안의 쉼이면 "Thank"만 남는다), 0.12s 이상 길며,
// 뒤에 더미 문장 길이(0.5~1.6s)만 남아야 한다. 이름처럼 짧은 본문은 쉼이 앞쪽에 올 수 있고, 본문 안에 쉼이 없어야 한다.
const tailCut = (raw: string, text: string): number | null => {
  const total = duration(raw);
  const gaps = silenceGaps(raw).filter((g) => g.start > 0.05);
  const last = gaps[gaps.length - 1];
  if (!last || last.start < 0.3 || last.end - last.start < 0.12) return null;
  const remaining = total - last.start;
  if (remaining < 0.5 || remaining > 1.6) return null;
  const isShort = text.trim().split(/\s+/).length <= 2;
  if (isShort && gaps.length > 1) return null;
  return last.start + KEEP_INTO_GAP;
};
const rmsDb = (file: string, from: number, to: number): number => {
  const log = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `atrim=start=${from}:end=${to},astats=measure_perchannel=none:measure_overall=RMS_level`, '-f', 'null', '-'], { encoding: 'utf-8' }).stderr;
  return Number(log.match(/RMS level dB: (-?[\d.]+|-inf)/)?.[1] ?? '-inf');
};

for (const { key, text } of narrationKeys(narration)) {
  const wav = path.join(outDir, `${key}.wav`);
  if (only && key !== only) continue;
  if (!force && manifest[key]?.text === text && existsSync(wav)) {
    console.info(`skip ${key} (unchanged)`);
    continue;
  }
  console.info(`generate ${key}: ${text}`);
  const tmpDir = path.join(root, 'video/narration/out', locale);
  mkdirSync(tmpDir, { recursive: true });
  const raw = path.join(tmpDir, 'clip_000.wav');
  let cut: number | null = null;
  for (let take = 1; take <= TAKES && cut === null; take++) {
    execFileSync(tts, [
      '--model', model, '--ref_audio', refAudio, '--ref_text', readFileSync(refText, 'utf-8').trim(),
      '--lang_code', locale, '--text', `${text} ${TAIL[locale]}`, '--output_path', tmpDir, '--file_prefix', 'clip', '--audio_format', 'wav',
    ], { stdio: ['ignore', 'ignore', 'inherit'] });
    cut = tailCut(raw, text);
    if (cut === null) console.warn(`  take ${take}: no pause before the tail sentence, retrying`);
  }
  if (cut === null) throw new Error(`${key}: could not find the pause before the tail sentence after ${TAKES} takes — tweak the sentence or rerun`);
  const tailDb = rmsDb(raw, Math.max(0, cut - KEEP_INTO_GAP - 0.08), cut - KEEP_INTO_GAP);
  // 앞 무음 정리 → 쉼에서 자르기 → 짧은 페이드아웃 → 여백. 48kHz 모노로 통일한다.
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af',
    `atrim=end=${cut.toFixed(3)},silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15,areverse,afade=t=in:d=${FADE_OUT},areverse,apad=pad_dur=${PAD_AFTER}`,
    '-ar', '48000', '-ac', '1', wav]);
  rmSync(raw);
  manifest[key] = { text, duration: Math.round(duration(wav) * 1000) / 1000 };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.info(`  → ${manifest[key]!.duration}s (cut at ${cut.toFixed(2)}s, tail ${tailDb.toFixed(1)} dB)`);
}
// 대본에서 사라진 키는 정리
for (const key of Object.keys(manifest)) {
  if (!narrationKeys(narration).some((k) => k.key === key)) { delete manifest[key]; const w = path.join(outDir, `${key}.wav`); if (existsSync(w)) renameSync(w, w + '.bak'); }
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.info(`manifest: ${Object.keys(manifest).length} clips → ${manifestPath}`);
