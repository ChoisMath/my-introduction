import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { embedBrandHtml } from './brand-embed';
import { BRAND_DIR, isBrandFile, resolveIn } from './volume';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

const notFound = () => new Response('Not found', { status: 404 });

// HTML 은 셸 숨김 스타일을 끼워 보낸다(brand-embed.ts). 캐시는 사본 갱신이 바로 보이도록 private 으로 둔다.
export async function serveBrandFile(root: string, rel: string): Promise<Response> {
  if (!isBrandFile(rel)) return notFound();
  let body: Buffer;
  try {
    body = await readFile(resolveIn(root, BRAND_DIR + rel));
  } catch {
    return notFound();
  }
  const ext = path.extname(rel);
  const payload = ext === '.html' ? embedBrandHtml(body.toString('utf8')) : new Uint8Array(body);
  return new Response(payload, {
    headers: {
      'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'private, no-cache' : 'private, max-age=600',
      'X-Robots-Tag': 'noindex',
    },
  });
}
