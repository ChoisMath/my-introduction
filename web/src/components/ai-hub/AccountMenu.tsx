'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { signOutAction } from '@/app/(ko)/ai/actions';
import type { ViewerState } from '@/lib/access';
import { AI_JOIN, AI_MEMBERS, AI_MOTION_ADMIN } from '@/lib/ai-paths';

type SignedIn = Exclude<ViewerState, { status: 'signedOut' }>;

const BADGE: Record<SignedIn['status'], string | null> = { admin: '관리자', member: '등록', pending: '승인 대기', guest: '미신청', unavailable: null };
const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' });

const TONE = {
  site: { chip: 'border-line bg-bg text-fg hover:border-accent', menu: 'border-line bg-bg text-fg', item: 'hover:bg-line/40', muted: 'text-muted', badge: 'bg-accent-soft text-fg' },
  dark: { chip: 'border-[#343946] bg-[#15171c] text-[#e8eaf0] hover:border-[#ffb547]', menu: 'border-[#343946] bg-[#15171c] text-[#e8eaf0]', item: 'hover:bg-[#1c1f26]', muted: 'text-[#a9afbd]', badge: 'bg-[#ffb547] text-[#1a1200]' },
} as const;

export function AccountMenu({ state, tone = 'site' }: { state: SignedIn; tone?: keyof typeof TONE }) {
  const [isOpen, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const from = usePathname();
  // 메뉴는 루트 레이아웃에 있어 클라이언트 이동 뒤에도 남는다. 경로가 바뀌면 렌더 중에 닫는다.
  const [lastPath, setLastPath] = useState(from);
  if (lastPath !== from) {
    setLastPath(from);
    setOpen(false);
  }
  const c = TONE[tone];
  const badge = BADGE[state.status];

  useEffect(() => {
    if (!isOpen) return;
    // 캡처 단계에서 Esc 를 먼저 받아 멈춘다. 편집기 상세(AdminDetail)의 Esc=목록으로 단축키가 함께 실행되지 않게.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('pointerdown', onDown); };
  }, [isOpen]);

  const item = `flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm whitespace-nowrap ${c.item}`;
  return (
    <div ref={root} className="relative flex-none">
      <button
        type="button"
        data-testid="account-chip"
        aria-label={`계정 메뉴: ${state.name}`}
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm whitespace-nowrap ${c.chip}`}
      >
        {state.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Google 프로필 주소라 next/image 대상이 아니다
          <img src={state.image} alt="" width={32} height={32} referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />
        ) : (
          <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-bg">{state.name.slice(0, 1)}</span>
        )}
        <span className="hidden max-w-[10rem] overflow-hidden text-ellipsis sm:inline">{state.name}</span>
        {badge ? <span className={`rounded-full px-2 text-xs font-semibold ${c.badge}`}>{badge}</span> : null}
      </button>
      {isOpen ? (
        <div id={menuId} data-testid="account-menu" className={`absolute right-0 z-50 mt-2 w-[min(88vw,18rem)] rounded-xl border p-2 shadow-lg ${c.menu}`}>
          <div className="px-3 py-2">
            <p className="overflow-hidden font-semibold text-ellipsis whitespace-nowrap">{state.name}</p>
            <p className={`overflow-hidden text-xs text-ellipsis whitespace-nowrap ${c.muted}`} title={state.email}>{state.email}</p>
            {state.status === 'pending' && state.member ? (
              <p className={`mt-1 text-xs whitespace-nowrap ${c.muted}`}>승인 대기 중 · {dateFormat.format(new Date(state.member.createdAt))} 신청</p>
            ) : null}
          </div>
          {state.status === 'guest' ? <Link href={AI_JOIN} prefetch={false} className={item} onClick={() => setOpen(false)}>가입 신청하기</Link> : null}
          {state.status === 'pending' ? <Link href={AI_JOIN} prefetch={false} className={item} onClick={() => setOpen(false)}>신청 내용 수정</Link> : null}
          {state.status === 'admin' || state.status === 'member' ? <Link href={AI_MOTION_ADMIN} prefetch={false} className={item} onClick={() => setOpen(false)}>모션그래픽 프롬프트</Link> : null}
          {state.status === 'admin' ? <Link href={AI_MEMBERS} prefetch={false} className={item} onClick={() => setOpen(false)}>회원 관리{state.pendingCount > 0 ? ` (대기 ${state.pendingCount})` : ''}</Link> : null}
          <form action={signOutAction}>
            <input type="hidden" name="from" value={from} />
            <button type="submit" className={item}>로그아웃</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
