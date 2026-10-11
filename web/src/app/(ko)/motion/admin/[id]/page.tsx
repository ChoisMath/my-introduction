import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMotion } from '@me/content';
import { PromptPanel } from '@/components/motion-gallery/admin/PromptPanel';
import { loadMotionAdmin } from '@/lib/admin-session';
import { getRenderedMotions } from '@/lib/media';

export const dynamic = 'force-dynamic';

export default async function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const motion = getMotion(id);
  if (!motion) notFound();
  const admin = await loadMotionAdmin(`/motion/admin/${id}/`);
  const data = admin?.find((a) => a.id === id) ?? null;
  const card = (await getRenderedMotions()).find((m) => m.id === id) ?? null;
  return (
    <article>
      <Link href="/motion/admin/" prefetch={false} className="inline-flex min-h-11 items-center text-sm whitespace-nowrap text-muted">← 관리자 목록</Link>
      <h1 className="mt-2 text-2xl font-bold whitespace-nowrap">{String(motion.no).padStart(2, '0')} {motion.name}</h1>
      {card ? <video src={card.video} poster={card.poster} controls playsInline preload="metadata" className="mt-4 aspect-video w-full max-w-3xl rounded-[var(--radius-card)] bg-black" /> : <p className="mt-4 text-sm text-muted">아직 렌더하지 않은 스타일입니다.</p>}
      {data ? <PromptPanel item={data} /> : <p role="alert" className="mt-6 text-sm">관리자 데이터가 없습니다. <code>npm run media:push</code> 를 실행하세요.</p>}
    </article>
  );
}
