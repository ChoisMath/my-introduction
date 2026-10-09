'use client';
import { motion, useReducedMotion } from 'motion/react';
import { HERO_CYCLE_MS, useHeroCycle } from './hero-cycle';

const W = 1200; const H = 700; const STEP = 40;
// 글자가 세로 가운데에 놓이므로 곡선은 위쪽 띠(viewBox 상단 ~25%)에만 그린다. xMidYMin 으로 상단에 붙인다.
const curve = 'M0 157 C 200 157, 260 49, 420 87 S 700 170, 860 106 S 1100 30, 1200 55';
// 주기 안에서 곡선이 그려지는 구간(0.4–2.0s)과 지워지는 구간(마지막 0.7s). 타자 효과와 같은 시계를 쓴다.
const DRAW_FROM = 400; const DRAW_TO = 2000; const ERASE_FROM = HERO_CYCLE_MS - 700;
const at = (ms: number) => ms / HERO_CYCLE_MS;

export function GridBackground() {
  const reduced = useReducedMotion();
  const cycle = useHeroCycle();
  const vLines = Array.from({ length: W / STEP + 1 }, (_, i) => i * STEP);
  const hLines = Array.from({ length: H / STEP + 1 }, (_, i) => i * STEP);
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin slice" aria-hidden>
      <g stroke="var(--color-grid)" strokeWidth="1">
        {vLines.map((x, i) => (
          <motion.line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: i * 0.01 }} />
        ))}
        {hLines.map((y, i) => (
          <motion.line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: i * 0.015 }} />
        ))}
      </g>
      {reduced ? (
        <path className="hero-curve" d={curve} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" />
      ) : (
        <motion.path key={cycle} className="hero-curve" d={curve} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 0, 1, 1, 0] }}
          transition={{ duration: HERO_CYCLE_MS / 1000, times: [0, at(DRAW_FROM), at(DRAW_TO), at(ERASE_FROM), 1], ease: ['linear', 'easeInOut', 'linear', 'easeIn'] }} />
      )}
    </svg>
  );
}
