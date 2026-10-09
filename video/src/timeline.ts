export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const SCENES = [
  { id: 'opening', from: 0, to: 6 },
  { id: 'tagline', from: 6, to: 14 },
  { id: 'timeline', from: 14, to: 30 },
  { id: 'pillars', from: 30, to: 42 },
  { id: 'stats', from: 42, to: 50 },
  { id: 'projects', from: 50, to: 68 },
  { id: 'books', from: 68, to: 76 },
  { id: 'ending', from: 76, to: 82 },
] as const;
export type SceneId = (typeof SCENES)[number]['id'];

const byId = new Map<string, { from: number; to: number }>(SCENES.map((s) => [s.id, s]));

export function sceneFrames(id: SceneId): { from: number; durationInFrames: number } {
  const s = byId.get(id);
  if (!s) throw new Error(`unknown scene: ${id}`);
  return { from: s.from * FPS, durationInFrames: (s.to - s.from) * FPS };
}

export const INTRO_DURATION = SCENES[SCENES.length - 1]!.to * FPS;
export const HERO_LOOP_DURATION = 20 * FPS;
