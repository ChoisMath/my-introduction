import { AbsoluteFill } from 'remotion';
import { HEIGHT, WIDTH } from '../timeline';
import { theme } from '../theme';

export const CURVE = 'M0 760 C 320 760, 420 300, 680 480 S 1120 880, 1380 560 S 1760 200, 1920 320';
export const CURVE_END = { x: 1920, y: 320 };
// 웹 히어로 루프용: 글자가 놓이는 가운데를 피해 위쪽 띠(y 60–330)에 같은 모양으로.
export const CURVE_TOP = 'M0 282 C 320 282, 420 100, 680 171 S 1120 330, 1380 203 S 1760 60, 1920 108';

export function Curve({ progress, d = CURVE, color = theme.color.accent, strokeWidth = 6 }: { progress: number; d?: string; color?: string; strokeWidth?: number }) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <AbsoluteFill>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
      </svg>
    </AbsoluteFill>
  );
}
