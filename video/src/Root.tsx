import { Composition, Still } from 'remotion';
import { Intro } from './compositions/Intro';
import { HeroLoop } from './compositions/HeroLoop';
import { OgImage } from './compositions/OgImage';
import { buildPlan } from './plan';
import { FPS, HEIGHT, HERO_LOOP_DURATION, WIDTH, totalFrames } from './timeline';
import './fonts';

export function Root() {
  return (
    <>
      <Composition id="Intro-ko" component={Intro} durationInFrames={totalFrames(buildPlan('ko').scenes)} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{ locale: 'ko', bgm: null }} />
      <Composition id="Intro-en" component={Intro} durationInFrames={totalFrames(buildPlan('en').scenes)} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{ locale: 'en', bgm: null }} />
      <Composition id="HeroLoop" component={HeroLoop} durationInFrames={HERO_LOOP_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{ locale: 'ko' }} />
      <Still id="OgImage" component={OgImage} width={1200} height={630} defaultProps={{ locale: 'ko' }} />
    </>
  );
}
