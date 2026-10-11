import 'server-only';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { parseRange } from './range';
import { isServablePath, resolveIn } from './volume';

const CONTENT_TYPES: Record<string, string> = { '.mp4': 'video/mp4', '.webp': 'image/webp' };

const notFound = () => new Response('Not found', { status: 404 });

export async function serveMedia(root: string, rel: string, req: Request): Promise<Response> {
  if (!isServablePath(rel)) return notFound();
  const file = resolveIn(root, rel);
  let info;
  try {
    info = await stat(file);
  } catch {
    return notFound();
  }
  const size = info.size;
  const headers = new Headers({
    'Content-Type': CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream',
    'Accept-Ranges': 'bytes',
  });
  const range = parseRange(req.headers.get('range'), size);
  if (range === 'unsatisfiable') {
    headers.set('Content-Range', `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  // URL 에 ?v=<sha> 가 붙어 내용이 바뀌면 주소도 바뀐다. 416 에 immutable 을 붙이면 오류가 캐시된다.
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('ETag', `"${size}-${Math.trunc(info.mtimeMs)}"`);
  const { start, end } = range ?? { start: 0, end: Math.max(0, size - 1) };
  const length = size === 0 ? 0 : end - start + 1;
  headers.set('Content-Length', String(length));
  if (range) headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  const status = range ? 206 : 200;
  if (req.method === 'HEAD' || length === 0) return new Response(null, { status, headers });
  const body = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream<Uint8Array>;
  return new Response(body, { status, headers });
}
