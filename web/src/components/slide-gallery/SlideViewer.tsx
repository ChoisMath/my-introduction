'use client';
import { useEffect, useRef } from 'react';
import type { SlideFamily } from '@me/content';
import type { SlideCardData } from '@/lib/slides';
import { OPPADU_SLIDE_URL, OriginalCredit } from '@/components/ai-hub/OriginalSource';
import { SlidePrompt } from './SlidePrompt';
import { stepSlide, stepStyle, type ViewerPos } from './slide-order';

type Props = {
  list: SlideCardData[];
  pos: ViewerPos;
  onMove: (pos: ViewerPos) => void;
  onClose: () => void;
  familyLabel: (key: SlideFamily) => string;
  prompts: Record<string, string> | null;
};

const SWIPE_PX = 40;
const iconBtn = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-lg hover:bg-white/10';
const navBtn = 'absolute top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-2xl text-white';

export function SlideViewer({ list, pos, onMove, onClose, familyLabel, prompts }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<number | null>(null);
  const counts = list.map((s) => s.slides);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  // 의존성 배열 없이 매 렌더 다시 건다 — 최신 pos 로 넘겨야 한다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') onMove(stepSlide(pos, 1, counts));
      if (e.key === 'ArrowLeft') onMove(stepSlide(pos, -1, counts));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const style = list[pos.style];
  if (!style) return null;
  const go = (dir: 1 | -1) => onMove(stepSlide(pos, dir, counts));
  const goStyle = (dir: 1 | -1) => onMove(stepStyle(pos, dir, list.length));
  // iPhone Safari 처럼 요소 전체 화면을 지원하지 않는 브라우저에서는 단추를 숨긴다. 상세 창은 해시로만 열려 서버 렌더가 없다.
  const canFullscreen = document.fullscreenEnabled;
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.current?.requestFullscreen();
  };

  return (
    <dialog
      ref={dialog}
      data-testid="slide-viewer"
      aria-labelledby="slide-viewer-name"
      onClose={onClose}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-dark-bg p-0 text-dark-fg backdrop:bg-black/80"
    >
      <div className="flex h-full flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <div className="flex min-h-0 shrink-0 flex-col gap-2 p-2 sm:p-3 lg:flex-1 lg:p-4">
          <div
            ref={stage}
            data-testid="slide-stage"
            className="relative flex aspect-video w-full touch-pan-y items-center justify-center bg-black lg:aspect-auto lg:min-h-0 lg:flex-1"
            onPointerDown={(e) => { swipeStart.current = e.clientX; }}
            onPointerUp={(e) => {
              const start = swipeStart.current;
              swipeStart.current = null;
              if (start !== null && Math.abs(e.clientX - start) >= SWIPE_PX) go(e.clientX < start ? 1 : -1);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Volume 에서 스트리밍하는 버전 URL 이라 next/image 대상이 아니다 */}
            <img data-testid="slide-viewer-img" src={style.images[pos.slide]} alt={`${style.name} ${pos.slide + 1}번째 장`} width={1376} height={768} draggable={false} className="max-h-full max-w-full object-contain select-none" />
            <button type="button" aria-label="이전 슬라이드" title="이전 슬라이드 (←)" onClick={() => go(-1)} className={`${navBtn} left-1`}>‹</button>
            <button type="button" aria-label="다음 슬라이드" title="다음 슬라이드 (→)" onClick={() => go(1)} className={`${navBtn} right-1`}>›</button>
            {canFullscreen ? (
              <button type="button" aria-label="전체 화면 전환" title="전체 화면" onClick={toggleFull} className={`${iconBtn} absolute top-1 right-1 bg-black/50 text-white`}>⛶</button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <div role="group" aria-label="이 스타일의 예시 슬라이드" className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
              {style.thumbs.map((src, k) => (
                <button
                  key={src}
                  type="button"
                  aria-label={`${k + 1}번째 장`}
                  aria-current={k === pos.slide ? 'true' : undefined}
                  onClick={() => onMove({ style: pos.style, slide: k })}
                  className={`h-12 shrink-0 overflow-hidden rounded border-2 sm:h-14 ${k === pos.slide ? 'border-accent-soft' : 'border-transparent opacity-60'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- 위와 같음 */}
                  <img src={src} alt="" width={172} height={96} className="h-full w-auto" />
                </button>
              ))}
            </div>
            <span data-testid="slide-pos" className="shrink-0 font-mono text-xs whitespace-nowrap">{pos.slide + 1} / {style.slides}</span>
          </div>
        </div>
        <aside className="flex flex-col gap-3 border-t border-white/10 p-3 lg:w-96 lg:shrink-0 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button type="button" aria-label="이전 스타일" title="이전 스타일" onClick={() => goStyle(-1)} className={iconBtn}>‹</button>
              <span data-testid="slide-style-count" className="font-mono text-xs whitespace-nowrap">{pos.style + 1} / {list.length}</span>
              <button type="button" aria-label="다음 스타일" title="다음 스타일" onClick={() => goStyle(1)} className={iconBtn}>›</button>
            </div>
            <button type="button" aria-label="닫기" autoFocus onClick={() => dialog.current?.close()} className={iconBtn}>✕</button>
          </div>
          <p className="text-xs whitespace-nowrap text-dark-fg/70">{familyLabel(style.family)} · {style.no}</p>
          <h2 id="slide-viewer-name" className="text-xl font-bold">{style.name}</h2>
          <p className="text-sm leading-relaxed">{style.look}</p>
          <p className="text-sm"><span className="mr-2 font-semibold whitespace-nowrap">이럴 때 좋아요</span>{style.use}</p>
          {style.topic ? <p className="text-sm"><span className="mr-2 font-semibold whitespace-nowrap">예시 주제</span>{style.topic}</p> : null}
          {style.source === 'oppadu' ? <OriginalCredit href={OPPADU_SLIDE_URL} gallery="슬라이드 스타일" className="text-dark-fg/70" /> : null}
          <SlidePrompt id={style.id} prompt={prompts?.[style.id] ?? null} />
        </aside>
      </div>
    </dialog>
  );
}
