// .media-out/ 을 서버 Volume 과 비교해 바뀐 파일만 업로드한다. 관리자 데이터와 manifest 는 마지막에 항상 올린다.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { mediaManifestSchema } from '../content/motion/schema';
import { diffManifest, sha256File } from './media/manifest';

const BASE = (process.env.MEDIA_PUSH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const TOKEN = process.env.MEDIA_UPLOAD_TOKEN;
const OUT = path.resolve('.media-out');
const SETS = {
  motion: { manifest: 'media/motion/manifest.json', admin: 'private/motion-admin.json', importCmd: 'motion:import' },
  slide: { manifest: 'media/slide/manifest.json', admin: 'private/slide-admin.json', importCmd: 'slide:import' },
} as const;
const setArg = process.argv.includes('--set') ? process.argv[process.argv.indexOf('--set') + 1] : 'motion';
if (setArg !== 'motion' && setArg !== 'slide') throw new Error(`--set must be motion or slide, got ${setArg}`);
const { manifest: MANIFEST, admin: ADMIN, importCmd } = SETS[setArg];

if (!TOKEN) throw new Error('MEDIA_UPLOAD_TOKEN is not set');
const auth = { authorization: `Bearer ${TOKEN}` };

async function put(rel: string) {
  const file = path.join(OUT, rel);
  const res = await fetch(`${BASE}/api/media?path=${encodeURIComponent(rel)}`, {
    method: 'PUT',
    headers: { ...auth, 'x-content-sha256': await sha256File(file), 'content-length': String(statSync(file).size), 'content-type': 'application/octet-stream' },
    body: Readable.toWeb(createReadStream(file)) as ReadableStream,
    duplex: 'half',
  } as RequestInit);
  if (!res.ok) throw new Error(`upload failed ${rel}: ${res.status} ${await res.text()}`);
  console.info(`uploaded ${rel}`);
}

if (!existsSync(path.join(OUT, ADMIN))) throw new Error(`${ADMIN} missing — run npm run ${importCmd} first`);
const local = mediaManifestSchema.parse(JSON.parse(await readFile(path.join(OUT, MANIFEST), 'utf8')));
const remoteRes = await fetch(`${BASE}/api/media/manifest?set=${setArg}`, { headers: auth });
if (!remoteRes.ok) throw new Error(`manifest fetch failed: ${remoteRes.status}`);
const remote = mediaManifestSchema.parse(await remoteRes.json());
const changed = diffManifest(local, remote);
console.info(`${changed.length} changed of ${Object.keys(local).length}`);
for (const rel of changed) await put(rel);
await put(ADMIN);
await put(MANIFEST);
console.info('done');
