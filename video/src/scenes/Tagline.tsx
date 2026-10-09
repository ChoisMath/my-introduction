// 이름이 좌상단으로 작아지고 소개문이 타이핑된다
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import { Grid } from '../components/Grid';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

export function Tagline({ content }: { content: Content; caption?: boolean }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const move = spring({ frame, fps, config: { damping: 18 } });
  const intro = content.profile.intro;
  const shown = Math.floor(interpolate(frame, [0.5 * fps, durationInFrames - 1.5 * fps], [0, intro.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const cursorOn = Math.floor(frame / (fps / 2)) % 2 === 0;
  return (
    <AbsoluteFill style={{ background: theme.color.bg }}>
      <Grid progress={1} />
      <div style={{ position: 'absolute', left: 120, top: interpolate(move, [0, 1], [440, 140]), fontFamily: SANS, fontWeight: 800, color: theme.color.fg, fontSize: interpolate(move, [0, 1], [160, 72]), letterSpacing: -2 }}>
        {content.profile.name}
        <span style={{ fontFamily: MONO, fontSize: 32, color: theme.color.accent, marginLeft: 24, fontWeight: 400 }}>{content.profile.affiliation} · {content.profile.role}</span>
      </div>
      <div style={{ position: 'absolute', left: 120, right: 120, top: 300, fontFamily: SANS, fontSize: 52, lineHeight: 1.5, color: theme.color.fg, opacity: move, wordBreak: 'keep-all' }}>
        {intro.slice(0, shown)}
        <span style={{ opacity: cursorOn ? 1 : 0, color: theme.color.accent }}>▍</span>
      </div>
    </AbsoluteFill>
  );
}
