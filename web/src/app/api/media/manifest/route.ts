import { readFile } from 'node:fs/promises';
import { tokenMatches } from '@/lib/media-upload';
import { BRAND_MANIFEST_PATH, MANIFEST_PATH, SLIDE_MANIFEST_PATH, resolveIn, volumeRoot } from '@/lib/volume';

const MANIFESTS: Record<string, string> = { slide: SLIDE_MANIFEST_PATH, brand: BRAND_MANIFEST_PATH };

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!tokenMatches(req.headers.get('authorization'), process.env.MEDIA_UPLOAD_TOKEN)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const rel = MANIFESTS[new URL(req.url).searchParams.get('set') ?? ''] ?? MANIFEST_PATH;
  try {
    return new Response(await readFile(resolveIn(volumeRoot(), rel)), { headers: { 'Content-Type': 'application/json' } });
  } catch {
    return Response.json({});
  }
}
