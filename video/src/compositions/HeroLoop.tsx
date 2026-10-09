// Opening(6s) + Timeline(14s, 자막 없음) — 웹 히어로 배경 루프
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { getContent, type Locale } from '@me/content';
import { FPS, HERO_LOOP_DURATION } from '../timeline';
import { theme } from '../theme';
import { Opening } from '../scenes/Opening';
import { Timeline } from '../scenes/Timeline';
import { loopVeil } from '../loop';

export function HeroLoop({ locale }: { locale: Locale }) {
  const content = getContent(locale);
  const veil = loopVeil(useCurrentFrame(), HERO_LOOP_DURATION, FPS);
  return (
    <AbsoluteFill style={{ background: theme.color.bg }}>
      <Sequence from={0} durationInFrames={6 * FPS} name="opening"><Opening content={content} showName={false} /></Sequence>
      <Sequence from={6 * FPS} durationInFrames={HERO_LOOP_DURATION - 6 * FPS} name="timeline"><Timeline content={content} caption={false} minimal /></Sequence>
      <AbsoluteFill style={{ background: theme.color.bg, opacity: veil, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
}
