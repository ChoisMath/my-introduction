'use client';
import { useState, useSyncExternalStore } from 'react';
import { useReducedMotion } from 'motion/react';

const DESKTOP = '(min-width: 640px)';
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
// 서버 렌더에서는 항상 false → 포스터 버튼으로 시작하고, 데스크톱에서만 하이드레이션 후 영상으로 바뀐다.
const useIsDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP).matches, () => false);

export function HeroVideo({ srcMp4, srcWebm, poster, playLabel }: { srcMp4: string; srcWebm: string; poster: string; playLabel: string }) {
  const reduced = useReducedMotion();
  const isDesktop = useIsDesktop();
  const [tapped, setTapped] = useState(false);
  // 모바일은 데이터 절약을 위해 탭 후에만 로드한다.
  const wantsVideo = tapped || (!reduced && isDesktop);
  if (!wantsVideo) {
    return (
      <button type="button" onClick={() => setTapped(true)} aria-label={playLabel} className="absolute inset-0 block h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${poster})` }} />
    );
  }
  return (
    <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline poster={poster} data-testid="hero-video">
      <source src={srcWebm} type="video/webm" />
      <source src={srcMp4} type="video/mp4" />
    </video>
  );
}
