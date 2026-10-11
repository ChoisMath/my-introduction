import { serveMedia } from '@/lib/media-serve';
import { volumeRoot } from '@/lib/volume';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(req: Request, { params }: Ctx) {
  const { path } = await params;
  // 라우트가 /media 아래에 있으므로 Volume 상대경로에는 'media/' 를 다시 붙인다.
  return serveMedia(volumeRoot(), ['media', ...path].join('/'), req);
}

export { handle as GET, handle as HEAD };
