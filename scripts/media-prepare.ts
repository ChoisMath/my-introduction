// MOTION_SRC/media/chois/<id>.mp4 (HyperFrames 렌더)를 웹용으로 다시 인코딩해 .media-out/ 에 Volume 과 같은 구조로 둔다.
// 이 ffmpeg 빌드에는 WebP 인코더가 없어 포스터는 PNG 를 뽑은 뒤 cwebp 로 변환한다.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildManifest, sha256File } from './media/manifest';

const SRC = process.env.MOTION_SRC ?? '/Volumes/Chois_SD2/dev/motion';
const OUT = path.resolve('.media-out');
const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'] });

const renders = path.join(SRC, 'media/chois');
const ids = readdirSync(renders).filter((f) => /^\d{2}-[a-z0-9-]+\.mp4$/.test(f)).map((f) => f.slice(0, -4)).sort();

for (const id of ids) {
  const src = path.join(renders, `${id}.mp4`);
  const dir = path.join(OUT, 'media/motion', id);
  mkdirSync(dir, { recursive: true });
  const stamp = path.join(dir, '.source-sha256');
  const srcSha = await sha256File(src);
  const outputs = ['video.mp4', 'preview.mp4', 'poster.webp'].map((f) => path.join(dir, f));
  if (existsSync(stamp) && readFileSync(stamp, 'utf8') === srcSha && outputs.every((f) => existsSync(f))) {
    console.info(`skip ${id}`);
    continue;
  }
  const [video, preview, poster] = outputs as [string, string, string];
  run('ffmpeg', ['-y', '-v', 'error', '-i', src, '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', video]);
  run('ffmpeg', ['-y', '-v', 'error', '-i', src, '-an', '-vf', 'scale=640:360', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', preview]);
  const png = path.join(dir, 'poster.png');
  run('ffmpeg', ['-y', '-v', 'error', '-ss', '9', '-i', src, '-frames:v', '1', '-vf', 'scale=1280:720', png]);
  run('cwebp', ['-quiet', '-q', '82', png, '-o', poster]);
  rmSync(png);
  writeFileSync(stamp, srcSha);
  console.info(`prepared ${id}`);
}

const manifest = await buildManifest(OUT);
writeFileSync(path.join(OUT, 'media/motion/manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.info(`manifest: ${Object.keys(manifest).length} files`);
