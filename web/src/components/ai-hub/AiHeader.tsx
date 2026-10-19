import Link from 'next/link';
import { getContent } from '@me/content';
import type { ViewerState } from '@/lib/access';
import { AI_MEMBERS } from '@/lib/ai-paths';
import { AiTabs } from './AiTabs';

export function AiHeader({ state }: { state: ViewerState }) {
  const { ui } = getContent('ko');
  return (
    <header data-testid="ai-header" className="gutter pt-6">
      <div className="mx-auto flex w-full max-w-site flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight whitespace-nowrap sm:text-3xl">{ui.sections.ai}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{ui.ai.intro}</p>
          </div>
          {state.status === 'admin' && state.pendingCount > 0 ? (
            <Link href={AI_MEMBERS} prefetch={false} data-testid="members-badge" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent">
              {ui.ai.members}<span className="rounded-full bg-accent px-2 text-xs font-bold text-bg">{state.pendingCount}</span>
            </Link>
          ) : null}
        </div>
        <AiTabs locale="ko" />
      </div>
    </header>
  );
}
