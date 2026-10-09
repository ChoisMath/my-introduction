// progress 0→1 로 격자선이 그려진다
import { AbsoluteFill } from 'remotion';
import { HEIGHT, WIDTH } from '../timeline';
import { theme } from '../theme';

const STEP = 60;

export function Grid({ progress, dark = false }: { progress: number; dark?: boolean }) {
  const stroke = dark ? theme.color.darkSurface : theme.color.grid;
  const v = Array.from({ length: WIDTH / STEP + 1 }, (_, i) => i * STEP);
  const h = Array.from({ length: HEIGHT / STEP + 1 }, (_, i) => i * STEP);
  const p = Math.max(0, Math.min(1, progress));
  return (
    <AbsoluteFill>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <g stroke={stroke} strokeWidth={1}>
          {v.map((x) => <line key={`v${x}`} x1={x} y1={0} x2={x} y2={HEIGHT} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />)}
          {h.map((y) => <line key={`h${y}`} x1={0} y1={y} x2={WIDTH} y2={y} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />)}
        </g>
      </svg>
    </AbsoluteFill>
  );
}
