// 숫자 4개 카운트업(2×2)
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { computeStats, type Content } from '@me/content';
import { Grid } from '../components/Grid';
import { Caption } from '../components/Caption';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

const KEYS = ['years', 'lectures', 'books', 'services'] as const;

export function Stats({ content }: { content: Content }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stats = computeStats(content);
  return (
    <AbsoluteFill style={{ background: theme.color.bg, fontFamily: SANS }}>
      <Grid progress={1} />
      <div style={{ position: 'absolute', inset: '140px 200px 200px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        {KEYS.map((k, i) => {
          const s = spring({ frame: frame - i * 0.3 * fps, fps, config: { damping: 14 } });
          const n = Math.round(interpolate(frame, [i * 0.3 * fps, i * 0.3 * fps + 2 * fps], [0, stats[k]], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
          return (
            <div key={k} style={{ opacity: s, transform: `scale(${0.9 + 0.1 * s})`, background: theme.color.bg, border: `3px solid ${theme.color.line}`, borderRadius: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 180, fontWeight: 700, color: theme.color.accent, lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 36, color: theme.color.muted, marginTop: 12 }}>{content.ui.stats[k]}</div>
            </div>
          );
        })}
      </div>
      <Caption text={content.ui.sections.stats} />
    </AbsoluteFill>
  );
}
