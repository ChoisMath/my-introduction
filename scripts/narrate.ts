// content/ko/narration.json → video/public/narration/ko/<key>.wav + manifest.json (길이·대본).
// Qwen3-TTS(mlx-audio) 에 Voicebox "Chois" 프로필의 참조 음성(video/narration/ref, git 제외)을 붙여 목소리를 복제한다.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getNarration, narrationKeys } from '../content/index';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const refAudio = path.join(root, 'video/narration/ref/chois.wav');
const refText = path.join(root, 'video/narration/ref/chois.txt');
const outDir = path.join(root, 'video/public/narration/ko');
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
const narration = getNarration('ko');
if (!narration) throw new Error('no ko narration');

const duration = (file: string) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]).toString().trim());

for (const { key, text } of narrationKeys(narration)) {
  const wav = path.join(outDir, `${key}.wav`);
  if (manifest[key]?.text === text && existsSync(wav)) {
    console.info(`skip ${key} (unchanged)`);
    continue;
  }
  console.info(`generate ${key}: ${text}`);
  const tmpDir = path.join(root, 'video/narration/out');
  mkdirSync(tmpDir, { recursive: true });
  execFileSync(tts, [
    '--model', model, '--ref_audio', refAudio, '--ref_text', readFileSync(refText, 'utf-8').trim(),
    '--lang_code', 'ko', '--text', text, '--output_path', tmpDir, '--file_prefix', 'clip', '--audio_format', 'wav',
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  const raw = path.join(tmpDir, 'clip_000.wav');
  // 앞뒤 무음을 잘라 타이밍 계산을 정확하게 하고, 48kHz 모노로 통일한다.
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af',
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.25,areverse',
    '-ar', '48000', '-ac', '1', wav]);
  rmSync(raw);
  manifest[key] = { text, duration: Math.round(duration(wav) * 1000) / 1000 };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.info(`  → ${manifest[key]!.duration}s`);
}
// 대본에서 사라진 키는 정리
for (const key of Object.keys(manifest)) {
  if (!narrationKeys(narration).some((k) => k.key === key)) { delete manifest[key]; const w = path.join(outDir, `${key}.wav`); if (existsSync(w)) renameSync(w, w + '.bak'); }
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.info(`manifest: ${Object.keys(manifest).length} clips → ${manifestPath}`);
