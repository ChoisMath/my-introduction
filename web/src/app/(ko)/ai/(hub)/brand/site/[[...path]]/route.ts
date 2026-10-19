import { serveBrandFile } from '@/lib/brand-site';
import { volumeRoot } from '@/lib/volume';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ path?: string[] }> };

// 사본은 상대 주소(assets/·data/·brand/)로 서로를 읽으므로 이 경로 아래에 원래 폴더 구조 그대로 둔다.
// 오빠두엑셀의 허락을 받아 누구에게나 서빙한다. 허용 목록(isBrandFile) 밖의 경로는 serveBrandFile 이 404 로 막는다.
export async function GET(_req: Request, { params }: Ctx) {
  const { path = [] } = await params;
  return serveBrandFile(volumeRoot(), path.length ? path.join('/') : 'index.html');
}
