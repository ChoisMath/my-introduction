import 'server-only';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { mediaManifestSchema, motionAdminListSchema, slideAdminListSchema } from '@me/content';
import { ADMIN_PATH, MANIFEST_PATH, SLIDE_ADMIN_PATH, SLIDE_MANIFEST_PATH, isUploadablePath, resolveIn } from './volume';

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

class TooLarge extends Error {}

const JSON_SCHEMAS: Record<string, { parse(value: unknown): unknown }> = {
  [MANIFEST_PATH]: mediaManifestSchema,
  [ADMIN_PATH]: motionAdminListSchema,
  [SLIDE_MANIFEST_PATH]: mediaManifestSchema,
  [SLIDE_ADMIN_PATH]: slideAdminListSchema,
};

const fail = (status: number, error: string) => Response.json({ error }, { status });

export function tokenMatches(header: string | null, expected: string | undefined): boolean {
  if (!expected || !header?.startsWith('Bearer ')) return false;
  const given = Buffer.from(header.slice('Bearer '.length));
  const want = Buffer.from(expected);
  return given.length === want.length && timingSafeEqual(given, want);
}

export async function handleUpload(root: string, req: Request, expectedToken: string | undefined, maxBytes = MAX_UPLOAD_BYTES): Promise<Response> {
  if (!tokenMatches(req.headers.get('authorization'), expectedToken)) return fail(401, 'unauthorized');
  const rel = new URL(req.url).searchParams.get('path') ?? '';
  if (!isUploadablePath(rel)) return fail(400, 'path not allowed');
  if (Number(req.headers.get('content-length') ?? 0) > maxBytes) return fail(413, 'too large');
  const expectedSha = req.headers.get('x-content-sha256') ?? '';
  if (!/^[0-9a-f]{64}$/.test(expectedSha) || !req.body) return fail(400, 'missing sha or body');

  const dest = resolveIn(root, rel);
  await mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.${randomUUID()}.part`;
  const hash = createHash('sha256');
  let bytes = 0;
  const meter = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      bytes += chunk.length;
      if (bytes > maxBytes) return done(new TooLarge());
      hash.update(chunk);
      done(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(req.body as unknown as NodeReadableStream), meter, createWriteStream(tmp));
  } catch (error) {
    await rm(tmp, { force: true });
    if (error instanceof TooLarge) return fail(413, 'too large');
    throw error;
  }
  if (hash.digest('hex') !== expectedSha) {
    await rm(tmp, { force: true });
    return fail(422, 'sha256 mismatch');
  }
  const schema = JSON_SCHEMAS[rel];
  if (schema) {
    try {
      schema.parse(JSON.parse(await readFile(tmp, 'utf8')));
    } catch (error) {
      await rm(tmp, { force: true });
      console.error(`[upload] ${rel} failed validation`, error);
      return fail(422, 'invalid json');
    }
  }
  await rename(tmp, dest);
  return Response.json({ ok: true, path: rel, size: bytes });
}
