import { getContent, getNarration, type Locale } from '@me/content';
import manifestKo from '../public/narration/ko/manifest.json';
import manifestEn from '../public/narration/en/manifest.json';
import { buildScenes, type Manifest, type Scene } from './timeline';

export type Plan = {
  locale: Locale;
  manifest: Manifest;
  scenes: Scene[];
  careerIds: string[];
  projectIds: string[];
  // 내레이션 클립의 staticFile 경로. 클립이 없으면 null.
  clip: (key: string) => string | null;
};

const manifests: Record<Locale, Manifest> = { ko: manifestKo as Manifest, en: manifestEn as Manifest };

export function buildPlan(locale: Locale): Plan {
  const content = getContent(locale);
  const narration = getNarration(locale);
  const manifest = manifests[locale];
  const career = content.profile.career.map((c) => c.id);
  // 내레이션이 있으면 대본에 있는 경력만 노드로 보여준다 (2013 영재교육원 강사 제외).
  const careerIds = narration ? career.filter((id) => id in narration.timeline) : career;
  const projectIds = content.projects.map((p) => p.id);
  return {
    locale,
    manifest,
    scenes: buildScenes(manifest, careerIds, projectIds),
    careerIds,
    projectIds,
    clip: (key) => (manifest[key] ? `narration/${locale}/${key}.wav` : null),
  };
}
