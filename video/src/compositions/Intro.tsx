import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { getContent, type Locale } from '@me/content';
import { INTRO_DURATION, SCENES, sceneFrames } from '../timeline';
import { theme } from '../theme';
import { Caption } from '../components/Caption';

export type IntroProps = { locale: Locale; bgm: string | null };

export function Intro({ locale, bgm }: IntroProps) {
  const content = getContent(locale);
  void content;
  return (
    <AbsoluteFill style={{ background: theme.color.bg }}>
      {SCENES.map((s) => {
        const { from, durationInFrames } = sceneFrames(s.id);
        return (
          <Sequence key={s.id} from={from} durationInFrames={durationInFrames} name={s.id}>
            <Caption text={s.id} />
          </Sequence>
        );
      })}
      {bgm ? (
        <Audio src={staticFile(bgm)} volume={(f) => interpolate(f, [0, 30, INTRO_DURATION - 60, INTRO_DURATION], [0, 0.6, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      ) : null}
    </AbsoluteFill>
  );
}
