import type { ReactNode } from 'react';
import { AiHeader } from '@/components/ai-hub/AiHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { getViewerState } from '@/lib/access';

export const dynamic = 'force-dynamic';

export default async function AiHubLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AiHeader state={await getViewerState()} />
      {children}
      <SiteFooter>
        © 이 페이지는 <a href="https://oppadu.com/ai" target="_blank" rel="noreferrer" className="underline hover:text-fg">oppadu.com/ai</a>를 가공한 2차 저작물입니다.
      </SiteFooter>
    </>
  );
}
