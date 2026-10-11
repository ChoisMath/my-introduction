import { access, constants } from 'node:fs/promises';
import { volumeRoot } from '@/lib/volume';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await access(volumeRoot(), constants.W_OK);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('[health] volume is not writable', error);
    return Response.json({ ok: false }, { status: 503 });
  }
}
