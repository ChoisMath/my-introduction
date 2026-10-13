import { getBrandAccess } from '@/lib/access';
import { serveBrandFile } from '@/lib/brand-site';
import { volumeRoot } from '@/lib/volume';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ path?: string[] }> };

// 사본은 상대 주소(assets/·data/·brand/)로 서로를 읽으므로 이 경로 아래에 원래 폴더 구조 그대로 둔다.
export async function GET(_req: Request, { params }: Ctx) {
  if ((await getBrandAccess()).status !== 'allowed') return new Response('Not found', { status: 404 });
  const { path = [] } = await params;
  return serveBrandFile(volumeRoot(), path.length ? path.join('/') : 'index.html');
}
