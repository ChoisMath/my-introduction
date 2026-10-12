import { MOTION_GROUPS, getMotionList } from '@me/content';
import { AdminGallery } from '@/components/motion-gallery/admin/AdminGallery';
import type { AdminListItem } from '@/components/motion-gallery/admin/admin-list';
import { loadMotionAdmin } from '@/lib/access';
import { getRenderedMotions } from '@/lib/media';
import { AI_MOTION_ADMIN } from '@/lib/ai-paths';

export const dynamic = 'force-dynamic';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function AdminListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { role, list } = await loadMotionAdmin(AI_MOTION_ADMIN);
  const rendered = new Map((await getRenderedMotions()).map((m) => [m.id, m]));
  const sp = await searchParams;
  const items: AdminListItem[] = getMotionList().map(({ id, no, group, name, en, use, concept }) => {
    const card = rendered.get(id);
    return { id, no, group, name, en, use, concept, poster: card?.poster ?? null, preview: card?.preview ?? null };
  });
  return <AdminGallery items={items} groups={MOTION_GROUPS} initialGroup={first(sp.g)} initialQuery={first(sp.q)} hasAdminData={Boolean(list)} canManage={role === 'admin'} />;
}
