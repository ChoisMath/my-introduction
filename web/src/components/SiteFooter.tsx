import type { ReactNode } from 'react';

// 문구가 페이지마다 달라서 레이아웃이 아니라 각 페이지가 렌더한다. 화면 바닥에 고정되므로
// 같은 높이의 빈 칸을 본문 끝에 두어 마지막 내용이 가려지지 않게 한다.
export function SiteFooter({ children }: { children: ReactNode }) {
  return (
    <>
      <div aria-hidden className="h-[var(--footer-h)]" />
      <footer data-testid="site-footer" className="fixed inset-x-0 bottom-0 z-10 flex h-[var(--footer-h)] items-center overflow-x-auto border-t border-line bg-bg/90 px-2 text-xs whitespace-nowrap text-muted backdrop-blur sm:px-3">
        <p className="mx-auto">{children}</p>
      </footer>
    </>
  );
}
