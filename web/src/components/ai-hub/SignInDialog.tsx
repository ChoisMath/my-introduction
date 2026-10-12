'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { MemberSummary } from '@/lib/access';
import { joinPath } from '@/lib/ai-paths';
import { CONTACT_NOTE } from '@/components/motion-gallery/contact';
import { GoogleSignInButton } from '@/components/motion-gallery/GoogleSignInButton';

export type DialogState = 'signedOut' | 'guest' | 'pending' | 'unavailable';

const btn = 'inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent';
const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' });

const TITLE: Record<DialogState, string> = {
  signedOut: '로그인하여 프롬프트를 복사하세요.',
  guest: '아직 가입 신청을 하지 않은 계정입니다.',
  pending: '승인 대기 중입니다.',
  unavailable: '잠시 후 다시 시도해 주세요.',
};

export function SignInDialog({ open, onClose, state, from, member }: {
  open: boolean;
  onClose: () => void;
  state: DialogState;
  from: string;
  member: MemberSummary | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-testid="signin-dialog"
      aria-labelledby="signin-dialog-title"
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="m-auto w-[min(92vw,440px)] rounded-2xl bg-bg p-0 text-fg backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-3 p-3 sm:p-5">
        <h2 id="signin-dialog-title" className="text-lg font-bold">{TITLE[state]}</h2>
        {state === 'signedOut' ? <p className="text-sm text-muted">승인된 교사만 프롬프트를 쓸 수 있어요. 처음이면 가입 신청을 해 주세요.</p> : null}
        {state === 'pending' ? (
          <>
            <p className="text-sm text-muted">관리자가 확인하면 사용할 수 있어요.</p>
            {member ? (
              <dl className="grid grid-cols-[4rem_1fr] gap-x-2 gap-y-1 text-sm">
                <dt className="text-muted">이름</dt><dd className="overflow-hidden text-ellipsis whitespace-nowrap">{member.name}</dd>
                <dt className="text-muted">소속</dt><dd className="overflow-hidden text-ellipsis whitespace-nowrap">{member.affiliation}</dd>
                <dt className="text-muted">신청일</dt><dd>{dateFormat.format(new Date(member.createdAt))}</dd>
              </dl>
            ) : null}
          </>
        ) : null}
        <p className="text-xs text-muted">{CONTACT_NOTE}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {state === 'signedOut' ? (
            <>
              <GoogleSignInButton from={from} />
              <GoogleSignInButton from={from} label="가입 신청 (교사)" testId="join-signin" />
            </>
          ) : null}
          {state === 'guest' ? (
            <>
              <Link href={joinPath(from)} className={`${btn} bg-accent font-semibold text-bg`}>가입 신청하기</Link>
              <GoogleSignInButton from={from} label="다른 Google 계정으로 로그인" />
            </>
          ) : null}
          {state === 'pending' ? <Link href={joinPath(from)} className={btn}>신청 내용 수정</Link> : null}
          <button type="button" onClick={onClose} className={btn}>닫기</button>
        </div>
      </div>
    </dialog>
  );
}
