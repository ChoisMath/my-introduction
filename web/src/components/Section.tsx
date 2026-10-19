import type { ReactNode } from 'react';
import type { SectionId } from '@/lib/sections';

// width: site(1920, 카드·그리드) | wide(1536, 글이 섞인 섹션). 폭 숫자는 globals.css 의 @theme 토큰에만 있다.
export function Section({ id, title, dark = false, width = 'site', children }: {
  id: SectionId;
  title?: string;
  dark?: boolean;
  width?: 'site' | 'wide';
  children: ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-[var(--nav-h)] gutter py-10 lg:py-16 ${dark ? 'bg-dark-bg text-dark-fg' : ''}`}>
      <div className={`mx-auto w-full ${width === 'wide' ? 'max-w-wide' : 'max-w-site'}`}>
        {title ? <h2 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2> : null}
        {children}
      </div>
    </section>
  );
}
