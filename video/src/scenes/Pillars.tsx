// 세 칸이 아래에서 순차로 떠오른다. 내레이션은 제목만 읽는다.
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import type { Plan } from '../plan';
import { Grid } from '../components/Grid';
import { Clip } from '../components/Clip';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

export function Pillars({ content, plan }: { content: Content; plan: Plan }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: theme.color.bg, fontFamily: SANS }}>
      <Grid progress={1} />
      <div style={{ position: 'absolute', inset: '140px 120px 140px', display: 'flex', gap: 32 }}>
        {content.profile.pillars.map((p, i) => {
          const s = spring({ frame: frame - i * 0.6 * fps, fps, config: { damping: 14 } });
          return (
            <div key={p.id} style={{ flex: 1, background: theme.color.bg, border: `3px solid ${theme.color.line}`, borderRadius: 32, padding: 40, opacity: s, transform: `translateY(${(1 - s) * 80}px)`, wordBreak: 'keep-all' }}>
              <div style={{ fontFamily: MONO, fontSize: 28, color: theme.color.accent }}>0{i + 1}</div>
              <div style={{ fontSize: 56, fontWeight: 800, color: theme.color.fg, marginTop: 8 }}>{p.title}</div>
              <div style={{ fontSize: 30, color: theme.color.muted, marginTop: 16, lineHeight: 1.4 }}>{p.summary}</div>
              <ul style={{ marginTop: 32, paddingLeft: 0, listStyle: 'none', fontSize: 30, lineHeight: 1.6, color: theme.color.fg }}>
                {p.items.map((it) => <li key={it}>• {it}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
      <Clip plan={plan} id="pillars" from={Math.round(0.5 * fps)} />
    </AbsoluteFill>
  );
}
