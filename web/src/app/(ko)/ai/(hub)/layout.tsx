import type { ReactNode } from 'react';
import { AiHeader } from '@/components/ai-hub/AiHeader';
import { getViewerState } from '@/lib/access';

export const dynamic = 'force-dynamic';

export default async function AiHubLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AiHeader state={await getViewerState()} />
      {children}
    </>
  );
}
