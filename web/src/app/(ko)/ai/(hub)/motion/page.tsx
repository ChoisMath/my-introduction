import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { MOTION_GROUPS, getContent } from '@me/content';
import { MotionGallery } from '@/components/motion-gallery/MotionGallery';
import { getRenderedMotions } from '@/lib/media';
import { AI_MOTION, AI_MOTION_ADMIN } from '@/lib/ai-paths';

export const dynamic = 'force-dynamic';

const { ui } = getContent('ko');
export const metadata: Metadata = {
  title: `${ui.motion.title} · ${ui.siteTitle}`,
  description: ui.motion.intro,
  alternates: { canonical: AI_MOTION },
};

export default async function MotionPage() {
  const items = await getRenderedMotions();
  return (
    <section className="gutter pt-4 pb-8">
      <div className="mx-auto w-full max-w-site">
        <h2 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{ui.motion.title}</h2>
        <p className="mb-4 text-muted">{ui.motion.intro}</p>
        {items.length > 0 ? (
          <Suspense>
            <MotionGallery items={items} groups={MOTION_GROUPS} allLabel={ui.motion.all} />
          </Suspense>
        ) : (
          <p data-testid="motion-empty" className="text-muted">{ui.motion.empty}</p>
        )}
        <div className="mt-10 text-right">
          <Link href={AI_MOTION_ADMIN} prefetch={false} className="inline-flex min-h-11 items-center px-2 text-xs whitespace-nowrap text-muted">{ui.motion.admin}</Link>
        </div>
      </div>
    </section>
  );
}
