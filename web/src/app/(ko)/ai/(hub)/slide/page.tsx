import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SLIDE_FAMILIES, getContent } from '@me/content';
import { SlideGallery } from '@/components/slide-gallery/SlideGallery';
import { getSlidePromptAccess } from '@/lib/access';
import { AI_SLIDE } from '@/lib/ai-paths';
import { getRenderedSlides } from '@/lib/slides';

export const dynamic = 'force-dynamic';

const TITLE = '슬라이드 디자인';
const INTRO = 'NotebookLM·이미지 생성 AI로 수업 자료와 학교 행사 슬라이드를 만들 때 쓰는 스타일 프롬프트 모음입니다. 예시 슬라이드는 모두 학교 상황으로 새로 만들었습니다.';
const { ui } = getContent('ko');

export const metadata: Metadata = {
  title: `${TITLE} · ${ui.siteTitle}`,
  description: INTRO,
  alternates: { canonical: AI_SLIDE },
};

export default async function SlidePage() {
  const [items, access] = await Promise.all([getRenderedSlides(), getSlidePromptAccess()]);
  return (
    <section className="px-2 pt-4 pb-8 sm:px-3 md:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{TITLE}</h2>
        <p className="mb-4 text-muted">{INTRO}</p>
        {items.length > 0 ? (
          <Suspense>
            <SlideGallery items={items} families={SLIDE_FAMILIES} access={access} />
          </Suspense>
        ) : (
          <p data-testid="slide-empty" className="text-muted">예시 슬라이드를 준비하고 있어요.</p>
        )}
      </div>
    </section>
  );
}
