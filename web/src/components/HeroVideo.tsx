'use client';
import { useRef, useState, useSyncExternalStore } from 'react';
import { useReducedMotion } from 'motion/react';

const DESKTOP = '(min-width: 640px)';
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
// 서버 렌더에서는 항상 false → 포스터 버튼으로 시작하고, 데스크톱에서만 하이드레이션 후 영상으로 바뀐다.
const useIsDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP).matches, () => false);

type Props = { srcMp4: string; srcWebm: string; poster: string; playLabel: string; onLoop?: () => void };

// onLoop: 첫 재생과 매 루프 시작마다 호출된다. loop 영상은 ended 가 안 나오므로 currentTime 이 뒤로 감기는 순간으로 감지한다.
export function HeroVideo({ srcMp4, srcWebm, poster, playLabel, onLoop }: Props) {
  const reduced = useReducedMotion();
  const isDesktop = useIsDesktop();
  const [tapped, setTapped] = useState(false);
  const lastTime = useRef(0);
  // 모바일은 데이터 절약을 위해 탭 후에만 로드한다.
  const wantsVideo = tapped || (!reduced && isDesktop);
  if (!wantsVideo) {
    return (
      <button type="button" onClick={() => setTapped(true)} aria-label={playLabel} className="hero-poster absolute inset-0 block h-full w-full bg-no-repeat" style={{ backgroundImage: `url(${poster})` }} />
    );
  }
  return (
    <video className="hero-video absolute inset-0 h-full w-full" autoPlay muted loop playsInline poster={poster} data-testid="hero-video"
      onPlay={() => { lastTime.current = 0; onLoop?.(); }}
      onTimeUpdate={(e) => { const t = e.currentTarget.currentTime; if (t < lastTime.current - 1) onLoop?.(); lastTime.current = t; }}>
      <source src={srcWebm} type="video/webm" />
      <source src={srcMp4} type="video/mp4" />
    </video>
  );
}
