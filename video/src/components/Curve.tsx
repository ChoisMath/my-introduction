import { AbsoluteFill } from 'remotion';
import { HEIGHT, WIDTH } from '../timeline';
import { theme } from '../theme';

export const CURVE = 'M0 760 C 320 760, 420 300, 680 480 S 1120 880, 1380 560 S 1760 200, 1920 320';
export const CURVE_END = { x: 1920, y: 320 };

export function Curve({ progress, color = theme.color.accent, strokeWidth = 6 }: { progress: number; color?: string; strokeWidth?: number }) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <AbsoluteFill>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <path d={CURVE} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
      </svg>
    </AbsoluteFill>
  );
}
