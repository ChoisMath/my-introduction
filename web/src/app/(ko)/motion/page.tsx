import type { Metadata } from 'next';
import Link from 'next/link';
import { MOTION_GROUPS, getContent } from '@me/content';
import { MotionGallery } from '@/components/motion-gallery/MotionGallery';
import { getRenderedMotions } from '@/lib/media';

export const dynamic = 'force-dynamic';

const { ui } = getContent('ko');
export const metadata: Metadata = {
  title: `${ui.sections.motion} · ${ui.siteTitle}`,
  description: ui.motion.intro,
  alternates: { canonical: '/motion/' },
};

export default async function MotionPage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const { g } = await searchParams;
  const items = await getRenderedMotions();
  return (
    <section className="px-2 py-8 sm:px-3 md:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{ui.sections.motion}</h1>
        <p className="mb-4 text-muted">{ui.motion.intro}</p>
        {items.length > 0 ? (
          <MotionGallery items={items} groups={MOTION_GROUPS} allLabel={ui.motion.all} initialGroup={g ?? null} />
        ) : (
          <p data-testid="motion-empty" className="text-muted">{ui.motion.empty}</p>
        )}
        <div className="mt-10 text-right">
          <Link href="/motion/admin/" className="inline-flex min-h-11 items-center px-2 text-xs whitespace-nowrap text-muted">{ui.motion.admin}</Link>
        </div>
      </div>
    </section>
  );
}
