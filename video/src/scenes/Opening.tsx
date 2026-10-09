// 격자(0–2s) → 곡선(1.5–4s) → 점 → 이름(4.5s~) + 인사 내레이션
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import type { Plan } from '../plan';
import { Grid } from '../components/Grid';
import { Curve } from '../components/Curve';
import { Clip } from '../components/Clip';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

export function Opening({ content, plan, showName = true }: { content: Content; plan?: Plan; showName?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grid = interpolate(frame, [0, 2 * fps], [0, 1], { extrapolateRight: 'clamp' });
  const curve = interpolate(frame, [1.5 * fps, 4 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dot = spring({ frame: frame - 4 * fps, fps, config: { damping: 12 } });
  const name = spring({ frame: frame - 4.5 * fps, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ background: theme.color.bg }}>
      <Grid progress={grid} />
      <Curve progress={curve} />
      {showName ? <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 28 * dot, height: 28 * dot, borderRadius: 999, background: theme.color.accent, marginBottom: 24 }} />
        <div style={{ fontFamily: SANS, fontSize: 160, fontWeight: 800, color: theme.color.fg, opacity: name, transform: `translateY(${(1 - name) * 40}px)`, letterSpacing: -4 }}>
          {content.profile.name}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 40, color: theme.color.muted, opacity: name }}>{content.profile.tagline}</div>
      </AbsoluteFill> : null}
      {plan && showName ? <Clip plan={plan} id="opening" from={Math.round(4.5 * fps)} /> : null}
    </AbsoluteFill>
  );
}
