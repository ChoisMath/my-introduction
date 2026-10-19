import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SLIDE_FAMILIES, getContent } from '@me/content';
import { SlideGallery } from '@/components/slide-gallery/SlideGallery';
import { AI_SLIDE } from '@/lib/ai-paths';
import { getRenderedSlides, readSlideAdmin } from '@/lib/slides';
import { volumeRoot } from '@/lib/volume';

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
  // 스타일 프롬프트는 누구나 볼 수 있다(오빠두엑셀 허락). 상세 창은 해시로 열리므로 목록 요청에서 한 번에 싣는다.
  const [items, admin] = await Promise.all([getRenderedSlides(), readSlideAdmin(volumeRoot())]);
  const prompts = admin ? Object.fromEntries(admin.map((a) => [a.id, a.prompt])) : null;
  return (
    <section className="gutter pt-4 pb-8">
      <div className="mx-auto w-full max-w-site">
        <h2 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{TITLE}</h2>
        <p className="mb-4 text-muted">{INTRO}</p>
        {items.length > 0 ? (
          <Suspense>
            <SlideGallery items={items} families={SLIDE_FAMILIES} prompts={prompts} />
          </Suspense>
        ) : (
          <p data-testid="slide-empty" className="text-muted">예시 슬라이드를 준비하고 있어요.</p>
        )}
      </div>
    </section>
  );
}
