import { notFound } from 'next/navigation';
import { getMotion, getMotionList } from '@me/content';
import { AdminDetail } from '@/components/motion-gallery/admin/AdminDetail';
import { adminOrder } from '@/components/motion-gallery/admin/admin-list';
import { loadMotionAdmin } from '@/lib/access';
import { getRenderedMotions } from '@/lib/media';
import { AI_MOTION_ADMIN, aiMotionAdminPath } from '@/lib/ai-paths';

export const dynamic = 'force-dynamic';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function AdminDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const motion = getMotion(id);
  if (!motion) notFound();
  const { list } = await loadMotionAdmin(aiMotionAdminPath(id));
  const data = list?.find((a) => a.id === id) ?? null;
  const card = (await getRenderedMotions()).find((m) => m.id === id) ?? null;

  const sp = await searchParams;
  const query = new URLSearchParams();
  const group = first(sp.g);
  const q = first(sp.q);
  if (group) query.set('g', group);
  if (q) query.set('q', q);
  const suffix = query.size ? `?${query}` : '';
  const order = adminOrder(getMotionList(), id, group, q);
  const idx = order.findIndex((m) => m.id === id);
  const href = (m: { id: string } | undefined) => (m ? `${aiMotionAdminPath(m.id)}${suffix}` : null);

  return (
    <AdminDetail
      motion={motion}
      data={data}
      media={card ? { video: card.video, poster: card.poster } : null}
      pos={`${idx + 1} / ${order.length}`}
      prevHref={href(order[idx - 1])}
      nextHref={href(order[idx + 1])}
      closeHref={`${AI_MOTION_ADMIN}${suffix}`}
    />
  );
}
