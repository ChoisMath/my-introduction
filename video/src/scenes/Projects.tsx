// 다크 전환 후 카드 5장이 3초씩 중앙을 지나가고 마지막 3초에 그리드로 정렬
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import { Grid } from '../components/Grid';
import { Caption } from '../components/Caption';
import { MockupCard } from '../components/MockupCard';
import { theme } from '../theme';

const CARD_W = 900;
const SLOT_SEC = 3;

export function Projects({ content }: { content: Content }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const projects = content.projects;
  const darken = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });
  const gridStart = durationInFrames - 3 * fps;
  const toGrid = spring({ frame: frame - gridStart, fps, config: { damping: 16 } });
  const gridW = 420;
  return (
    <AbsoluteFill style={{ background: theme.color.darkBg }}>
      <AbsoluteFill style={{ background: theme.color.bg, opacity: 1 - darken }} />
      <Grid progress={1} dark />
      {projects.map((p, i) => {
        const start = fps + i * SLOT_SEC * fps;
        const enter = spring({ frame: frame - start, fps, config: { damping: 18 } });
        const exit = spring({ frame: frame - (start + (SLOT_SEC - 0.6) * fps), fps, config: { damping: 18 } });
        const passX = interpolate(enter, [0, 1], [2200, 960]) - interpolate(exit, [0, 1], [0, 2200]);
        // 그리드 위치: 위 3개, 아래 2개
        const col = i < 3 ? i : i - 3;
        const cols = i < 3 ? 3 : 2;
        const gx = 960 + (col - (cols - 1) / 2) * (gridW + 40);
        const gy = i < 3 ? 270 : 710;
        const x = interpolate(toGrid, [0, 1], [passX, gx]);
        const y = interpolate(toGrid, [0, 1], [540, gy]);
        const w = interpolate(toGrid, [0, 1], [CARD_W, gridW]);
        const visible = frame >= start || toGrid > 0;
        return (
          <div key={p.id} style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', opacity: visible ? 1 : 0 }}>
            <MockupCard project={p} width={w} />
          </div>
        );
      })}
      <Caption text={content.ui.sections.projects} dark />
    </AbsoluteFill>
  );
}
