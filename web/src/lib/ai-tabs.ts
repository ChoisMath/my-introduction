import { AI_MOTION } from './ai-paths';

export type AiTab = { id: string; label: { ko: string; en: string }; href: string };

// 새 분야(웹디자인 가이드·업무 프롬프트 등)는 여기 한 항목 + `app/(ko)/ai/(hub)/<id>/` 라우트로 추가한다.
export const AI_TABS: readonly AiTab[] = [
  { id: 'motion', label: { ko: '모션그래픽', en: 'Motion graphics' }, href: AI_MOTION },
];

export function activeTabId(pathname: string): string | null {
  return AI_TABS.find((t) => pathname.startsWith(t.href))?.id ?? null;
}
