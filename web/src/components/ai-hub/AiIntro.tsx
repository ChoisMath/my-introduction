'use client';
import { usePathname } from 'next/navigation';
import type { Locale } from '@me/content';
import { AI_TABS, activeTabId } from '@/lib/ai-tabs';

// 허브 공통 소개(허락 문구 포함) 뒤에 현재 탭의 소개 문장을 잇는다. 폭 제한 없이 화면 폭대로 줄바꿈한다.
export function AiIntro({ base, locale }: { base: string; locale: Locale }) {
  const active = activeTabId(usePathname());
  const tab = AI_TABS.find((t) => t.id === active);
  return (
    <p data-testid="ai-intro" className="text-sm text-muted">
      {base}
      {tab ? ` ${tab.intro[locale]}` : null}
    </p>
  );
}
