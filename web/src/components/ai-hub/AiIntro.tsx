'use client';
import { usePathname } from 'next/navigation';
import { useId, useState } from 'react';
import type { Locale } from '@me/content';
import { AI_TABS, activeTabId } from '@/lib/ai-tabs';

// 허브 공통 소개(허락 문구 포함) 뒤에 현재 탭의 소개 문장을 잇는다. 폭 제한 없이 화면 폭대로 줄바꿈한다.
// 모바일(<md)에서는 화면을 아끼려고 접어 두고, 가운데 ▼가 있는 가로선을 눌러 펼친다. md 이상은 항상 보인다.
export function AiIntro({ base, locale }: { base: string; locale: Locale }) {
  const active = activeTabId(usePathname());
  const tab = AI_TABS.find((t) => t.id === active);
  const [isOpen, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <p id={id} data-testid="ai-intro" className={`text-sm text-muted ${isOpen ? '' : 'hidden md:block'}`}>
        {base}
        {tab ? ` ${tab.intro[locale]}` : null}
      </p>
      <button
        type="button"
        data-testid="ai-intro-toggle"
        aria-controls={id}
        aria-expanded={isOpen}
        aria-label={isOpen ? '소개 접기' : '소개 펼치기'}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-8 w-full items-center gap-2 text-muted md:hidden"
      >
        <span aria-hidden className="h-px flex-1 bg-line" />
        <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span aria-hidden className="h-px flex-1 bg-line" />
      </button>
    </div>
  );
}
