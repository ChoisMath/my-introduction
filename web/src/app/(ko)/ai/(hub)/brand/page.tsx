import type { Metadata } from 'next';
import Link from 'next/link';
import { getContent } from '@me/content';
import { CONTACT_NOTE } from '@/components/motion-gallery/contact';
import { GoogleSignInButton } from '@/components/motion-gallery/GoogleSignInButton';
import { getBrandAccess, type BrandAccess } from '@/lib/access';
import { AI_BRAND, AI_BRAND_SITE, joinPath } from '@/lib/ai-paths';

export const dynamic = 'force-dynamic';

const TITLE = '브랜드 룩북';
const INTRO = '브랜드 290곳의 디자인 시스템(색·글꼴·컴포넌트)을 웹페이지 예시와 함께 보고, AI에 줄 디자인 가이드를 복사할 수 있습니다.';
const SOURCE = 'https://www.oppadu.com/ai/design-systems-site/';
const { ui } = getContent('ko');

export const metadata: Metadata = {
  title: `${TITLE} · ${ui.siteTitle}`,
  description: INTRO,
  alternates: { canonical: AI_BRAND },
  robots: { index: false },
};

const btn = 'inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent';
const GATE_TITLE: Record<Exclude<BrandAccess['status'], 'allowed'>, string> = {
  signedOut: '승인된 교사만 볼 수 있어요',
  guest: '아직 승인신청을 하지 않은 계정입니다.',
  pending: '승인 대기 중입니다.',
  unavailable: '잠시 후 다시 시도해 주세요.',
};

export default async function BrandPage() {
  const access = await getBrandAccess();
  const isAllowed = access.status === 'allowed';
  return (
    <section className="px-2 pt-2 pb-2 sm:px-3 md:px-4 md:pt-4 lg:px-6">
      <div className="mx-auto w-full max-w-6xl">
        {/* 원본 페이지가 같은 제목·소개를 갖고 있어, 볼 수 있을 때는 iframe 높이를 아끼려고 출처 한 줄만 둔다. */}
        {isAllowed ? null : (
          <>
            <h2 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{TITLE}</h2>
            <p className="mb-1 text-muted">{INTRO}</p>
          </>
        )}
        <p className="mb-2 text-xs text-muted">
          원본: <a href={SOURCE} target="_blank" rel="noreferrer" className="underline hover:text-fg">오빠두엑셀 브랜드 룩북</a> — 허락을 받아 그대로 옮겼습니다.
        </p>
      </div>
      {isAllowed ? (
        <iframe
          data-testid="brand-frame"
          src={AI_BRAND_SITE}
          title={TITLE}
          allow="clipboard-write"
          className="block h-[calc(100dvh-var(--nav-h)-var(--footer-h))] w-full rounded-lg border border-line bg-white"
        />
      ) : (
        <div data-testid="brand-gate" className="mx-auto flex w-full max-w-6xl flex-col gap-3 rounded-2xl border border-line p-3 sm:p-5">
          <h3 className="text-lg font-bold">{GATE_TITLE[access.status]}</h3>
          <p className="text-sm text-muted">{access.status === 'pending' ? '관리자가 확인하면 볼 수 있어요.' : '처음이면 Google로 로그인한 뒤 승인신청을 해 주세요.'}</p>
          <p className="text-xs text-muted">{CONTACT_NOTE}</p>
          <div className="flex flex-wrap gap-2">
            {access.status === 'signedOut' ? (
              <>
                <GoogleSignInButton from={AI_BRAND} />
                <GoogleSignInButton from={AI_BRAND} label="승인신청" testId="join-signin" />
              </>
            ) : null}
            {access.status === 'guest' ? <Link href={joinPath(AI_BRAND)} className={`${btn} bg-accent font-semibold text-bg`}>승인신청하기</Link> : null}
            {access.status === 'pending' ? <Link href={joinPath(AI_BRAND)} className={btn}>신청 내용 수정</Link> : null}
          </div>
        </div>
      )}
    </section>
  );
}
