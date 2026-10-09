// 가로축 2012→2026. 내레이션이 있으면 각 노드가 해당 클립 시작에 점등하고, 없으면 균등 간격.
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import type { Plan } from '../plan';
import { Grid } from '../components/Grid';
import { Badge } from '../components/Badge';
import { Clip } from '../components/Clip';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';
import { yearOf } from '../format';
import { timelineSchedule } from '../timeline';

const X0 = 160; const X1 = 1760;
// minimal(웹 히어로 루프)에서는 글자가 놓이는 가운데를 피해 축을 위쪽 띠로 올린다.
const AXIS_Y = 600; const AXIS_Y_MINIMAL = 240;

// minimal: 웹 히어로 루프용 — 축과 점만 그리고 글자·배지·내레이션은 뺀다.
export function Timeline({ content, plan, minimal = false }: { content: Content; plan?: Plan; minimal?: boolean }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const Y = minimal ? AXIS_Y_MINIMAL : AXIS_Y;
  const { career, education, awards } = content.profile;
  const nodes = plan ? career.filter((c) => plan.careerIds.includes(c.id)) : career;
  const schedule = plan ? timelineSchedule(plan.manifest, plan.careerIds, fps) : null;
  const axis = interpolate(frame, [0, 2 * fps], [0, 1], { extrapolateRight: 'clamp' });
  const highlights = [...education, ...awards].filter((x) => x.highlight);
  const lastSlot = schedule?.[schedule.length - 1];
  const badgeStart = lastSlot ? lastSlot.from + lastSlot.durationInFrames + 0.5 * fps : durationInFrames * 0.62;
  const badgeGap = Math.max(fps * 0.3, (durationInFrames - badgeStart - fps) / Math.max(1, highlights.length));
  return (
    <AbsoluteFill style={{ background: theme.color.bg, fontFamily: SANS }}>
      <Grid progress={1} />
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <line x1={X0} y1={Y} x2={X0 + (X1 - X0) * axis} y2={Y} stroke={theme.color.accent} strokeWidth={6} strokeLinecap="round" />
      </svg>
      {nodes.map((c, i) => {
        const x = X0 + ((X1 - X0) * (i + 0.5)) / nodes.length;
        const start = schedule ? schedule[i]!.from : 2 * fps + (durationInFrames * 0.6 * i) / nodes.length;
        const s = spring({ frame: frame - start, fps, config: { damping: 12 } });
        const up = i % 2 === 0;
        return (
          <div key={c.id} style={{ position: 'absolute', left: x, top: Y, transform: 'translate(-50%, -50%)', opacity: s }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: theme.color.bg, border: `6px solid ${theme.color.accent}`, transform: `scale(${s})` }} />
            {minimal ? null : <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: up ? -150 : 50, width: 320, textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 24, color: theme.color.muted, whiteSpace: 'nowrap' }}>{yearOf(c.period)}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: theme.color.fg, lineHeight: 1.25, wordBreak: 'keep-all' }}>{c.title}</div>
            </div>}
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 120, right: 120, top: 860, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24 }}>
        {minimal ? null : highlights.map((h, i) => {
          const s = spring({ frame: frame - (badgeStart + badgeGap * i), fps, config: { damping: 12 } });
          return <div key={h.id} style={{ opacity: s, transform: `translateY(${(1 - s) * 40}px)` }}><Badge text={`${yearOf(h.period)} · ${h.title}`} /></div>;
        })}
      </div>
      {plan && schedule && !minimal ? schedule.map((slot) => <Clip key={slot.id} plan={plan} id={`timeline.${slot.id}`} from={slot.from} />) : null}
    </AbsoluteFill>
  );
}
