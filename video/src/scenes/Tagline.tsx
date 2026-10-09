// 이름이 좌상단으로 작아지고, 소개문이 내레이션 길이에 맞춰 타자기처럼 쳐진다
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import type { Plan } from '../plan';
import { Grid } from '../components/Grid';
import { Clip } from '../components/Clip';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

const LEAD = 0.5;

export function Tagline({ content, plan }: { content: Content; plan: Plan }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const move = spring({ frame, fps, config: { damping: 18 } });
  const intro = content.profile.intro;
  const narrated = plan.manifest.tagline?.duration;
  const typingEnd = narrated ? (LEAD + narrated) * fps : durationInFrames - 1.5 * fps;
  const shown = Math.floor(interpolate(frame, [LEAD * fps, typingEnd], [0, intro.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
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
      <Clip plan={plan} id="tagline" from={Math.round(LEAD * fps)} />
    </AbsoluteFill>
  );
}
