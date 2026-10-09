'use client';
import { motion, useReducedMotion } from 'motion/react';

const W = 1200; const H = 700; const STEP = 40;
const curve = 'M0 520 C 200 520, 260 180, 420 300 S 700 560, 860 360 S 1100 120, 1200 200';

export function GridBackground() {
  const reduced = useReducedMotion();
  const vLines = Array.from({ length: W / STEP + 1 }, (_, i) => i * STEP);
  const hLines = Array.from({ length: H / STEP + 1 }, (_, i) => i * STEP);
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <g stroke="var(--color-grid)" strokeWidth="1">
        {vLines.map((x, i) => (
          <motion.line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: i * 0.01 }} />
        ))}
        {hLines.map((y, i) => (
          <motion.line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: i * 0.015 }} />
        ))}
      </g>
      <motion.path d={curve} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round"
        initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, delay: 0.6, ease: 'easeInOut' }} />
    </svg>
  );
}
