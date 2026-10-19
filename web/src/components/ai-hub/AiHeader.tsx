import Link from 'next/link';
import { getContent } from '@me/content';
import type { ViewerState } from '@/lib/access';
import { AI_MEMBERS } from '@/lib/ai-paths';
import { AiIntro } from './AiIntro';
import { AiTabs } from './AiTabs';

export function AiHeader({ state }: { state: ViewerState }) {
  const { ui } = getContent('ko');
  return (
    <header data-testid="ai-header" className="gutter pt-6">
      <div className="mx-auto flex w-full max-w-site flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="shrink-0 text-2xl font-bold tracking-tight whitespace-nowrap sm:text-3xl">{ui.sections.ai}</h1>
          <AiTabs locale="ko" />
          {state.status === 'admin' && state.pendingCount > 0 ? (
            <Link href={AI_MEMBERS} prefetch={false} data-testid="members-badge" className="ml-auto inline-flex min-h-8 items-center gap-2 rounded-full border border-line px-3 text-sm whitespace-nowrap hover:border-accent">
              {ui.ai.members}<span className="rounded-full bg-accent px-2 text-xs font-bold text-bg">{state.pendingCount}</span>
            </Link>
          ) : null}
        </div>
        <AiIntro base={ui.ai.intro} locale="ko" />
      </div>
    </header>
  );
}
