import { handleUpload } from '@/lib/media-upload';
import { volumeRoot } from '@/lib/volume';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  return handleUpload(volumeRoot(), req, process.env.MEDIA_UPLOAD_TOKEN);
}
