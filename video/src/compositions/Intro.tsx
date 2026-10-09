import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { getContent, type Content, type Locale } from '@me/content';
import { buildPlan, type Plan } from '../plan';
import { FPS, SCENE_IDS, sceneFrames, totalFrames, type SceneId } from '../timeline';
import { theme } from '../theme';
import { Opening } from '../scenes/Opening';
import { Tagline } from '../scenes/Tagline';
import { Timeline } from '../scenes/Timeline';
import { Pillars } from '../scenes/Pillars';
import { Stats } from '../scenes/Stats';
import { Projects } from '../scenes/Projects';
import { Books } from '../scenes/Books';
import { Ending } from '../scenes/Ending';

export type IntroProps = { locale: Locale; bgm: string | null };
export type SceneProps = { content: Content; plan: Plan };

const scenes: Record<SceneId, (p: SceneProps) => React.JSX.Element> = {
  opening: Opening, tagline: Tagline, timeline: Timeline, pillars: Pillars,
  stats: Stats, projects: Projects, books: Books, ending: Ending,
};

// 내레이션 아래에 깔리는 배경음악 볼륨. 앞 1초 페이드인, 끝 2초 페이드아웃.
const BGM_LEVEL = 0.22;

export function Intro({ locale, bgm }: IntroProps) {
  const content = getContent(locale);
  const plan = buildPlan(locale);
  const total = totalFrames(plan.scenes);
  return (
    <AbsoluteFill style={{ background: theme.color.bg }}>
      {SCENE_IDS.map((id) => {
        const { from, durationInFrames } = sceneFrames(plan.scenes, id);
        const Scene = scenes[id];
        return (
          <Sequence key={id} from={from} durationInFrames={durationInFrames} name={id}>
            <Scene content={content} plan={plan} />
          </Sequence>
        );
      })}
      {bgm ? (
        <Audio src={staticFile(bgm)} volume={(f) => interpolate(f, [0, FPS, total - 2 * FPS, total], [0, BGM_LEVEL, BGM_LEVEL, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      ) : null}
    </AbsoluteFill>
  );
}
