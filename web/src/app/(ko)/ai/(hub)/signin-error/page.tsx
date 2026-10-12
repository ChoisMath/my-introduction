import type { Metadata } from 'next';
import Link from 'next/link';
import { GoogleSignInButton } from '@/components/motion-gallery/GoogleSignInButton';
import { CONTACT_NOTE } from '@/components/motion-gallery/contact';
import { AI_MOTION } from '@/lib/ai-paths';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '로그인 안내', robots: { index: false, follow: false } };

export default async function SignInErrorPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const error = (await searchParams).error;
  const isDenied = error === 'AccessDenied';
  return (
    <article className="px-2 py-4 sm:py-10 sm:px-3 md:px-4 lg:px-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-[var(--radius-card)] border border-line p-3 sm:p-6">
        <h1 className="text-xl font-bold" data-testid="signin-error-title">{isDenied ? '등록되지 않은 Google 계정입니다.' : '로그인 중 문제가 발생했습니다.'}</h1>
        <p className="text-muted">{CONTACT_NOTE}</p>
        {isDenied ? null : <p className="overflow-hidden font-mono text-xs text-ellipsis whitespace-nowrap text-muted" title={String(error ?? 'Unknown')}>{String(error ?? 'Unknown')}</p>}
        <div className="flex flex-wrap gap-2">
          <GoogleSignInButton from={AI_MOTION} label="다른 Google 계정으로 로그인" />
          <Link href={AI_MOTION} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent">모션 갤러리로</Link>
        </div>
      </div>
    </article>
  );
}
