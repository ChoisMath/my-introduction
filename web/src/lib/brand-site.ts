import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { BRAND_DIR, isBrandFile, resolveIn } from './volume';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

const notFound = () => new Response('Not found', { status: 404 });

// 권한 확인은 호출하는 라우트가 한다. 회원 전용 내용이라 공유 캐시(CDN)에 남지 않게 private 으로 둔다.
export async function serveBrandFile(root: string, rel: string): Promise<Response> {
  if (!isBrandFile(rel)) return notFound();
  let body: Buffer;
  try {
    body = await readFile(resolveIn(root, BRAND_DIR + rel));
  } catch {
    return notFound();
  }
  const ext = path.extname(rel);
  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'private, no-cache' : 'private, max-age=600',
      'X-Robots-Tag': 'noindex',
    },
  });
}
