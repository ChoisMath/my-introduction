import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { getContent, type Locale } from '@me/content';
import { FPS, HERO_LOOP_DURATION } from '../timeline';
import { theme } from '../theme';
import { Grid } from '../components/Grid';

export function HeroLoop({ locale }: { locale: Locale }) {
  const frame = useCurrentFrame();
  void getContent(locale);
  return (
    <AbsoluteFill style={{ background: theme.color.bg }}>
      <Sequence from={0} durationInFrames={HERO_LOOP_DURATION}>
        <Grid progress={frame / (2 * FPS)} />
      </Sequence>
    </AbsoluteFill>
  );
}
