'use client';
import { createContext, useContext } from 'react';

// 배경 영상(video/src/timeline.ts HERO_LOOP_DURATION)과 같은 길이. 곡선·타자 효과가 이 주기로 반복된다.
export const HERO_CYCLE_MS = 20_000;

// 값은 주기 번호. 바뀔 때마다 곡선과 타자 효과가 처음부터 다시 시작한다.
export const HeroCycleContext = createContext(0);
export const useHeroCycle = () => useContext(HeroCycleContext);
