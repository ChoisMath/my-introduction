export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const SCENE_IDS = ['opening', 'tagline', 'timeline', 'pillars', 'stats', 'projects', 'books', 'ending'] as const;
export type SceneId = (typeof SCENE_IDS)[number];
export type Scene = { id: SceneId; from: number; to: number };
export type Manifest = Record<string, { text: string; duration: number }>;
export type Slot = { id: string; from: number; durationInFrames: number };

const dur = (m: Manifest, key: string) => m[key]?.duration ?? 0;
const frames = (sec: number, fps: number) => Math.round(sec * fps);

// 대본이 없는 타임라인 노드가 차지하는 시간과, 노드 사이 여유.
const NODE_FALLBACK = 1.6;
const NODE_GAP = 0.5;
const PROJECT_MIN = 2.4;
const PROJECT_PAD = 1.4;

export function timelineSchedule(m: Manifest, careerIds: string[], fps: number): Slot[] {
  let from = frames(2, fps);
  return careerIds.map((id) => {
    const d = dur(m, `timeline.${id}`) || NODE_FALLBACK;
    const slot = { id, from, durationInFrames: frames(d, fps) };
    from += frames(d + NODE_GAP, fps);
    return slot;
  });
}

export function projectSchedule(m: Manifest, projectIds: string[], fps: number): Slot[] {
  let from = frames(1, fps);
  return projectIds.map((id) => {
    const d = Math.max(PROJECT_MIN, dur(m, `projects.${id}`) + PROJECT_PAD);
    const slot = { id, from, durationInFrames: frames(d, fps) };
    from += slot.durationInFrames;
    return slot;
  });
}

// 씬 길이(초): 내레이션이 있으면 그 길이에 맞추고, 없으면 최소 길이.
export function buildScenes(m: Manifest, careerIds: string[], projectIds: string[]): Scene[] {
  const timelineNodes = careerIds.reduce((acc, id) => acc + (dur(m, `timeline.${id}`) || NODE_FALLBACK) + NODE_GAP, 0);
  const projectSlots = projectIds.reduce((acc, id) => acc + Math.max(PROJECT_MIN, dur(m, `projects.${id}`) + PROJECT_PAD), 0);
  const lengths: Record<SceneId, number> = {
    opening: Math.max(6, 4.5 + dur(m, 'opening') + 0.8),
    tagline: Math.max(8, 0.5 + dur(m, 'tagline') + 1.5),
    timeline: 2 + timelineNodes + 3,
    pillars: Math.max(8, 0.5 + dur(m, 'pillars') + 2),
    stats: 6,
    projects: 1 + projectSlots + 3,
    books: 6,
    ending: Math.max(6, 0.8 + dur(m, 'ending') + 2.5),
  };
  let t = 0;
  return SCENE_IDS.map((id) => {
    const scene = { id, from: t, to: t + lengths[id] };
    t = scene.to;
    return scene;
  });
}

export function sceneFrames(scenes: Scene[], id: SceneId): { from: number; durationInFrames: number } {
  const s = scenes.find((x) => x.id === id);
  if (!s) throw new Error(`unknown scene: ${id}`);
  const from = frames(s.from, FPS);
  return { from, durationInFrames: frames(s.to, FPS) - from };
}

export const totalFrames = (scenes: Scene[]) => frames(scenes[scenes.length - 1]!.to, FPS);

export const HERO_LOOP_DURATION = 20 * FPS;
