// 아직 다시 만들지 않아 오빠두엑셀 원본을 그대로 싣는 항목 표시. 허락 조건이 「출처를 밝힐 것」이라 카드와 상세 양쪽에 둔다.
export const OPPADU_MOTION_URL = 'https://www.oppadu.com/ai/motion-styles/';
export const OPPADU_SLIDE_URL = 'https://www.oppadu.com/ai/slide-styles/';

export function OriginalBadge() {
  return (
    <span data-testid="original-badge" title="오빠두엑셀 원본 예시" className="absolute top-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[11px] leading-none whitespace-nowrap text-white">
      원본
    </span>
  );
}

export function OriginalCredit({ href, gallery, className = '' }: { href: string; gallery: string; className?: string }) {
  return (
    <p data-testid="original-credit" className={`text-xs ${className}`}>
      {/* body 가 word-break: keep-all 이라 조각 사이 공백만 줄바꿈 자리다 — 공백을 nowrap 밖에 둔다. */}
      <span className="font-semibold whitespace-nowrap">출처</span>{' '}
      <a href={href} target="_blank" rel="noreferrer" className="whitespace-nowrap underline">오빠두엑셀 「{gallery}」</a>{' '}
      <span className="whitespace-nowrap">원본 예시·프롬프트</span>
    </p>
  );
}
