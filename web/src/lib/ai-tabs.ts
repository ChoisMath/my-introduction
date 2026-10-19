import { AI_BRAND, AI_MOTION, AI_SLIDE } from './ai-paths';

export type AiTab = { id: string; label: { ko: string; en: string }; href: string; intro: { ko: string; en: string } };

// 새 분야(웹디자인 가이드·업무 프롬프트 등)는 여기 한 항목 + `app/(ko)/ai/(hub)/<id>/` 라우트로 추가한다.
// intro 는 탭 페이지 본문이 아니라 허브 머리글(AiIntro)이 허락 문구 뒤에 이어서 보여 준다 — 페이지마다 제목을 또 두지 않는다.
export const AI_TABS: readonly AiTab[] = [
  {
    id: 'motion',
    label: { ko: '모션', en: 'Motion' },
    href: AI_MOTION,
    intro: { ko: '기초 바이브코딩부터 에이전틱 AI까지 — HyperFrames 로 직접 만든 10초 인트로.', en: '10-second intros I made with HyperFrames — from vibe-coding basics to agentic AI.' },
  },
  {
    id: 'slide',
    label: { ko: '슬라이드', en: 'Slides' },
    href: AI_SLIDE,
    intro: { ko: 'NotebookLM·이미지 생성 AI로 수업 자료와 학교 행사 슬라이드를 만들 때 쓰는 스타일 프롬프트 모음입니다. 예시 슬라이드는 모두 학교 상황으로 새로 만들었습니다.', en: 'Style prompts for class materials and school-event slides made with NotebookLM and image-generation AI. Every example deck was remade for school settings.' },
  },
  {
    id: 'brand',
    label: { ko: '브랜드', en: 'Brand' },
    href: AI_BRAND,
    intro: { ko: '브랜드 290곳의 디자인 시스템(색·글꼴·컴포넌트)을 웹페이지 예시와 함께 보고, AI에 줄 디자인 가이드를 복사할 수 있습니다.', en: 'Browse the design systems (colors, type, components) of 290 brands with web-page examples and copy a design guide to hand to AI.' },
  },
];

export function activeTabId(pathname: string): string | null {
  return AI_TABS.find((t) => pathname.startsWith(t.href))?.id ?? null;
}

export function aiTab(id: string): AiTab {
  const tab = AI_TABS.find((t) => t.id === id);
  if (!tab) throw new Error(`unknown AI tab: ${id}`);
  return tab;
}
