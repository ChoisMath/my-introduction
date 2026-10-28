import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { downloadablePath } from '@/lib/media-download';
import { tokenMatches } from '@/lib/media-upload';
import { resolveIn, volumeRoot } from '@/lib/volume';

export const dynamic = 'force-dynamic';

// me.chois.pro 폐쇄 전, class.chois.pro 로 비공개 프롬프트 JSON 을 옮기는 일회성 이전 스크립트용.
// 업로드와 같은 토큰으로만 열리고, 업로드 허용 경로 밖은 읽지 못한다.
export async function GET(req: Request) {
  if (!tokenMatches(req.headers.get('authorization'), process.env.MEDIA_UPLOAD_TOKEN)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const rel = new URL(req.url).searchParams.get('path') ?? '';
  if (!downloadablePath(rel)) return Response.json({ error: 'path not allowed' }, { status: 400 });

  const file = resolveIn(volumeRoot(), rel);
  let size: number;
  try {
    const info = await stat(file);
    if (!info.isFile()) return Response.json({ error: 'not found' }, { status: 404 });
    size = info.size;
  } catch {
    return Response.json({ error: 'not found' }, { status: 404 });
  }
  // 영상까지 허용 목록에 있어 통째로 메모리에 올리지 않고 스트림으로 내려보낸다.
  const body = Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>;
  return new Response(body, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(size), 'Cache-Control': 'no-store' } });
}
