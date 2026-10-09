import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import { Grid } from '../components/Grid';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

export function Ending({ content }: { content: Content }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16 } });
  const { profile } = content;
  return (
    <AbsoluteFill style={{ background: theme.color.bg, fontFamily: SANS, justifyContent: 'center', alignItems: 'center' }}>
      <Grid progress={1} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 80, opacity: s, transform: `translateY(${(1 - s) * 40}px)` }}>
        <Img src={staticFile(profile.pictogram.replace(/^\//, ''))} style={{ width: 360, height: 360, borderRadius: 48 }} />
        <div>
          <div style={{ fontSize: 96, fontWeight: 800, color: theme.color.fg }}>{profile.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 56, color: theme.color.accent, marginTop: 16 }}>me.chois.pro</div>
          <div style={{ fontFamily: MONO, fontSize: 30, color: theme.color.muted, marginTop: 24 }}>github.com/ChoisMath</div>
          <div style={{ fontFamily: MONO, fontSize: 30, color: theme.color.muted }}>{profile.links.email}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
