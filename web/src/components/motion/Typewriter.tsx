'use client';
import { useEffect, useState, type ElementType } from 'react';
import { useReducedMotion } from 'motion/react';
import { HERO_CYCLE_MS, useHeroCycle } from './hero-cycle';

// 곡선이 지워지는 마지막 0.7s 에 글자도 함께 지운다.
const ERASE_AT_MS = HERO_CYCLE_MS - 700;
const ERASE_MS_PER_CHAR = 35;
const CARET_LINGER_MS = 600;

type Props = { text: string; startMs: number; msPerChar: number; as?: ElementType; className?: string };

// 전체 글자를 항상 DOM 에 두고(정적 HTML·검색·접근성·줄바꿈 안정) 아직 안 친 부분만 투명하게 가린다.
export function Typewriter({ text, startMs, msPerChar, as: Tag = 'span', className }: Props) {
  const reduced = useReducedMotion();
  const cycle = useHeroCycle();
  const chars = Array.from(text);
  const total = chars.length;
  const [shown, setShown] = useState(total);
  const [caret, setCaret] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const typedAt = startMs + total * msPerChar;
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const t = performance.now() - t0;
      let n: number;
      if (t < startMs) n = 0;
      else if (t < ERASE_AT_MS) n = Math.min(total, Math.floor((t - startMs) / msPerChar) + 1);
      else n = Math.max(0, total - Math.floor((t - ERASE_AT_MS) / ERASE_MS_PER_CHAR));
      setShown(n);
      setCaret((t >= startMs && t < typedAt + CARET_LINGER_MS) || (t >= ERASE_AT_MS && n > 0));
      if (t < HERO_CYCLE_MS) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cycle, reduced, startMs, msPerChar, total]);

  const visible = reduced ? total : shown;
  return (
    <Tag className={className}>
      {chars.slice(0, visible).join('')}
      {caret && !reduced ? <span aria-hidden className="hero-caret" /> : null}
      <span className={visible < total ? 'opacity-0' : undefined}>{chars.slice(visible).join('')}</span>
    </Tag>
  );
}
