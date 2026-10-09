import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { getContent, type Content, type Locale } from '@me/content';
import { INTRO_DURATION, SCENES, sceneFrames, type SceneId } from '../timeline';
import { theme } from '../theme';
import { Caption } from '../components/Caption';
import { Opening } from '../scenes/Opening';
import { Tagline } from '../scenes/Tagline';
import { Timeline } from '../scenes/Timeline';
import { Pillars } from '../scenes/Pillars';

export type IntroProps = { locale: Locale; bgm: string | null };

const scenes: Record<SceneId, (p: { content: Content }) => React.JSX.Element> = {
  opening: Opening,
  tagline: Tagline,
  timeline: Timeline,
  pillars: Pillars,
  stats: () => <Caption text="stats" />,
  projects: () => <Caption text="projects" dark />,
  books: () => <Caption text="books" />,
  ending: () => <Caption text="ending" />,
};

export function Intro({ locale, bgm }: IntroProps) {
  const content = getContent(locale);
  return (
    <AbsoluteFill style={{ background: theme.color.bg }}>
      {SCENES.map((s) => {
        const { from, durationInFrames } = sceneFrames(s.id);
        const Scene = scenes[s.id];
        return (
          <Sequence key={s.id} from={from} durationInFrames={durationInFrames} name={s.id}>
            <Scene content={content} />
          </Sequence>
        );
      })}
      {bgm ? (
        <Audio src={staticFile(bgm)} volume={(f) => interpolate(f, [0, 30, INTRO_DURATION - 60, INTRO_DURATION], [0, 0.6, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      ) : null}
    </AbsoluteFill>
  );
}
