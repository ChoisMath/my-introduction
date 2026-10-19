import type { Metadata } from 'next';
import { getContent } from '@me/content';
import { AI_BRAND, AI_BRAND_SITE } from '@/lib/ai-paths';

export const dynamic = 'force-dynamic';

const TITLE = '브랜드 룩북';
const INTRO = '브랜드 290곳의 디자인 시스템(색·글꼴·컴포넌트)을 웹페이지 예시와 함께 보고, AI에 줄 디자인 가이드를 복사할 수 있습니다.';
const SOURCE = 'https://www.oppadu.com/ai/design-systems-site/';
const { ui } = getContent('ko');

// 원본 사이트의 사본이라 검색 색인은 원본에 맡긴다(robots.txt 의 Disallow 와 짝).
export const metadata: Metadata = {
  title: `${TITLE} · ${ui.siteTitle}`,
  description: INTRO,
  alternates: { canonical: AI_BRAND },
  robots: { index: false },
};

// 누구나 볼 수 있다(오빠두엑셀 허락). 원본 페이지가 같은 제목·소개를 갖고 있어 iframe 높이를 아끼려고 출처 한 줄만 둔다.
export default function BrandPage() {
  return (
    <section className="px-2 pt-2 pb-2 sm:px-3 md:px-4 md:pt-4 lg:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <p className="mb-2 text-xs text-muted">
          원본: <a href={SOURCE} target="_blank" rel="noreferrer" className="underline hover:text-fg">오빠두엑셀 브랜드 룩북</a> — 허락을 받아 그대로 옮겼습니다.
        </p>
      </div>
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
