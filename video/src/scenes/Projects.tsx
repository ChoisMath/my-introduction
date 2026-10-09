// 다크 전환 후 카드가 하나씩 중앙을 지나가며(각 슬롯 = 이름 내레이션 + 여유) 마지막 3초에 그리드로 정렬
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import type { Plan } from '../plan';
import { Grid } from '../components/Grid';
import { Clip } from '../components/Clip';
import { MockupCard } from '../components/MockupCard';
import { theme } from '../theme';
import { projectSchedule } from '../timeline';

const CARD_W = 900;

export function Projects({ content, plan }: { content: Content; plan: Plan }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const projects = content.projects;
  const schedule = projectSchedule(plan.manifest, plan.projectIds, fps);
  const darken = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });
  const gridStart = durationInFrames - 3 * fps;
  const toGrid = spring({ frame: frame - gridStart, fps, config: { damping: 16 } });
  const gridW = 420;
  return (
    <AbsoluteFill style={{ background: theme.color.darkBg }}>
      <AbsoluteFill style={{ background: theme.color.bg, opacity: 1 - darken }} />
      <Grid progress={1} dark />
      {projects.map((p, i) => {
        const slot = schedule[i]!;
        const start = slot.from;
        const exitAt = start + slot.durationInFrames - 0.6 * fps;
        const enter = spring({ frame: frame - start, fps, config: { damping: 18 } });
        const exit = spring({ frame: frame - exitAt, fps, config: { damping: 18 } });
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
      {schedule.map((slot) => <Clip key={slot.id} plan={plan} id={`projects.${slot.id}`} from={slot.from + Math.round(0.4 * fps)} />)}
    </AbsoluteFill>
  );
}
