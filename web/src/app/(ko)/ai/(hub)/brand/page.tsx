import type { Metadata } from 'next';
import { getContent } from '@me/content';
import { AI_BRAND, AI_BRAND_SITE } from '@/lib/ai-paths';
import { aiTab } from '@/lib/ai-tabs';

export const dynamic = 'force-dynamic';

const TITLE = '브랜드 룩북';
const INTRO = aiTab('brand').intro.ko;
const { ui } = getContent('ko');

// 원본 사이트의 사본이라 검색 색인은 원본에 맡긴다(robots.txt 의 Disallow 와 짝).
export const metadata: Metadata = {
  title: `${TITLE} · ${ui.siteTitle}`,
  description: INTRO,
  alternates: { canonical: AI_BRAND },
  robots: { index: false },
};

// 누구나 볼 수 있다(오빠두엑셀 허락). 제목·소개는 허브 머리글이, 출처는 푸터(HubFooterNote)가 맡으므로 iframe 만 둔다.
export default function BrandPage() {
  return (
    <section className="gutter pt-2 pb-2 md:pt-4">
      <iframe
        data-testid="brand-frame"
        src={AI_BRAND_SITE}
        title={TITLE}
        allow="clipboard-write"
        className="block h-[calc(100dvh-var(--nav-h)-var(--footer-h))] w-full rounded-lg border border-line bg-white"
      />
    </section>
  );
}
