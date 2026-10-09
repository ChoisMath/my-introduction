'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { GridBackground } from './GridBackground';
import { HeroVideo } from '../HeroVideo';
import { HERO_CYCLE_MS, HeroCycleContext } from './hero-cycle';

type Video = { srcMp4: string; srcWebm: string; poster: string; playLabel: string };

export function HeroStage({ video, children }: { video: Video; children: ReactNode }) {
  const [cycle, setCycle] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const arm = useCallback(() => {
    clearInterval(timer.current);
    timer.current = setInterval(() => setCycle((c) => c + 1), HERO_CYCLE_MS);
  }, []);
  useEffect(() => {
    arm();
    return () => clearInterval(timer.current);
  }, [arm]);
  // 영상이 처음 재생되거나 한 바퀴 돌 때 주기를 영상에 맞춘다. 영상이 없는 모바일은 타이머만으로 돈다.
  const restart = useCallback(() => {
    setCycle((c) => c + 1);
    arm();
  }, [arm]);
  return (
    <HeroCycleContext.Provider value={cycle}>
      <GridBackground />
      <div className="absolute inset-0 opacity-60"><HeroVideo {...video} onLoop={restart} /></div>
      {children}
    </HeroCycleContext.Provider>
  );
}
