import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { GoogleSignInButton } from '@/components/motion-gallery/GoogleSignInButton';
import { JoinForm } from '@/components/ai-hub/JoinForm';
import { getViewerState } from '@/lib/access';
import { AI_JOIN, safeReturnPath } from '@/lib/ai-paths';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '가입 신청', robots: { index: false, follow: false } };

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' });

export default async function JoinPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).from;
  const from = safeReturnPath(Array.isArray(raw) ? raw[0] : raw);
  const state = await getViewerState();
  if (state.status === 'admin' || state.status === 'member') redirect(from);

  return (
    <section className="px-2 py-6 sm:px-3 md:px-4 lg:px-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-[var(--radius-card)] border border-line p-3 sm:p-6">
        <h2 className="text-xl font-bold whitespace-nowrap">교사 가입 신청</h2>
        {state.status === 'signedOut' ? (
          <>
            <p className="text-sm text-muted">본인 Google 계정으로 로그인한 뒤 이름과 소속을 적어 주세요. 관리자가 확인하면 프롬프트를 쓸 수 있어요.</p>
            <GoogleSignInButton from={from === AI_JOIN ? '/ai/motion/' : from} />
          </>
        ) : state.status === 'unavailable' ? (
          <p role="alert" className="text-sm">잠시 후 다시 시도해 주세요.</p>
        ) : (
          <>
            <p className="text-sm">
              <span className="text-muted">Google 계정 </span>
              <span data-testid="join-email" className="font-mono">{state.email}</span>
            </p>
            {state.status === 'pending' && state.member ? (
              <p data-testid="join-state" className="rounded-lg bg-accent-soft px-3 py-2 text-sm">
                승인 대기 중 · {dateFormat.format(new Date(state.member.createdAt))} 신청
              </p>
            ) : null}
            <JoinForm defaults={{ name: state.member?.name ?? state.name, affiliation: state.member?.affiliation ?? '' }} isPending={state.status === 'pending'} from={from} />
          </>
        )}
      </div>
    </section>
  );
}
