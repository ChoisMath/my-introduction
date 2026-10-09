// 밝게 복귀, 표지 3권 부채꼴, 아래로 연수 기관 티커
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import type { Plan } from '../plan';
import { Grid } from '../components/Grid';
import { SANS, theme } from '../theme';

export function Books({ content }: { content: Content; plan?: Plan }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lighten = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });
  const orgs = content.profile.lecturesTeacher.map((l) => l.org ?? l.title).join('   ·   ');
  const tickerX = interpolate(frame, [fps, 8 * fps], [1920, -2400]);
  return (
    <AbsoluteFill style={{ background: theme.color.darkBg, fontFamily: SANS }}>
      <AbsoluteFill style={{ background: theme.color.bg, opacity: lighten }} />
      <Grid progress={1} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 120, display: 'flex', justifyContent: 'center', gap: 48 }}>
        {content.profile.books.map((b, i) => {
          const s = spring({ frame: frame - (0.5 + i * 0.4) * fps, fps, config: { damping: 14 } });
          const rot = (i - 1) * 8;
          return (
            <div key={b.id} style={{ opacity: s, transform: `translateY(${(1 - s) * 80}px) rotate(${rot * s}deg)`, textAlign: 'center' }}>
              <Img src={staticFile(b.cover.replace(/^\//, ''))} style={{ width: 360, borderRadius: 12, boxShadow: '0 24px 60px rgba(15,23,42,0.25)' }} />
              <div style={{ fontSize: 28, fontWeight: 700, color: theme.color.fg, marginTop: 20, width: 360, wordBreak: 'keep-all' }}>{b.title}</div>
              <div style={{ fontSize: 22, color: theme.color.muted }}>{b.role.split(' ')[0]} · {b.year}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', top: 900, left: tickerX, whiteSpace: 'nowrap', fontSize: 34, color: theme.color.accent, fontWeight: 600 }}>{orgs}</div>
    </AbsoluteFill>
  );
}
