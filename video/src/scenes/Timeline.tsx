// 가로축 2012→2026, 노드 6개 순차 점등, 배지 3개 떠오름. 씬 길이(durationInFrames)에 맞춰 타이밍을 계산한다.
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import { Grid } from '../components/Grid';
import { Badge } from '../components/Badge';
import { Caption } from '../components/Caption';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

const X0 = 160; const X1 = 1760; const Y = 600;

// minimal: 웹 히어로 루프용 — 축과 점만 그리고 글자·배지는 뺀다.
export function Timeline({ content, caption = true, minimal = false }: { content: Content; caption?: boolean; minimal?: boolean }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { career, education, awards } = content.profile;
  const axis = interpolate(frame, [0, 2 * fps], [0, 1], { extrapolateRight: 'clamp' });
  const nodeWindow = durationInFrames * 0.6;
  const highlights = [...education, ...awards].filter((x) => x.highlight);
  const badgeStart = durationInFrames * 0.62;
  const badgeGap = (durationInFrames - badgeStart - fps) / Math.max(1, highlights.length);
  return (
    <AbsoluteFill style={{ background: theme.color.bg, fontFamily: SANS }}>
      <Grid progress={1} />
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <line x1={X0} y1={Y} x2={X0 + (X1 - X0) * axis} y2={Y} stroke={theme.color.accent} strokeWidth={6} strokeLinecap="round" />
      </svg>
      {career.map((c, i) => {
        const x = X0 + ((X1 - X0) * (i + 0.5)) / career.length;
        const s = spring({ frame: frame - (2 * fps + (nodeWindow * i) / career.length), fps, config: { damping: 12 } });
        const up = i % 2 === 0;
        return (
          <div key={c.id} style={{ position: 'absolute', left: x, top: Y, transform: 'translate(-50%, -50%)', opacity: s }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: theme.color.bg, border: `6px solid ${theme.color.accent}`, transform: `scale(${s})` }} />
            {minimal ? null : <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: up ? -150 : 50, width: 300, textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 24, color: theme.color.muted, whiteSpace: 'nowrap' }}>{c.period.split(' ')[0]}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: theme.color.fg, lineHeight: 1.25, wordBreak: 'keep-all' }}>{c.title}</div>
            </div>}
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 860, display: 'flex', justifyContent: 'center', gap: 24 }}>
        {minimal ? null : highlights.map((h, i) => {
          const s = spring({ frame: frame - (badgeStart + badgeGap * i), fps, config: { damping: 12 } });
          return <div key={h.id} style={{ opacity: s, transform: `translateY(${(1 - s) * 40}px)` }}><Badge text={`${h.period} ${h.title}`} /></div>;
        })}
      </div>
      {caption ? <Caption text={`${career[0]?.period.slice(0, 4)} → ${career[career.length - 1]?.period.slice(0, 4)}`} /> : null}
    </AbsoluteFill>
  );
}
