import type { MotionAdmin } from '@me/content';

export type PromptLang = 'en' | 'ko';
export type PromptState = { values: Record<string, string>; toggles: Record<string, boolean>; withTables: boolean };
export type Segment = { text: string; mark?: 'value' | 'on' | 'off' };
export type Placeholder = { key: string; flag: '' | '?' | '-'; label: string; def: string };

export const FIELD_KEYS = [
  { key: 'name', en: 'Channel name', ko: '채널 이름' },
  { key: 'tagline', en: 'Tagline', ko: '한 줄 소개' },
  { key: 'topic', en: 'Topic', ko: '주제' },
  { key: 'length', en: 'Length', ko: '길이' },
  { key: 'format', en: 'Format', ko: '화면' },
  { key: 'lang', en: 'On-screen language', ko: '화면 글자' },
] as const;

export const TOGGLE_KEYS = [
  { key: 'logo', en: 'Logo', ko: '로고' },
  { key: 'soundtrack', en: 'Soundtrack source', ko: '사운드트랙 만들기' },
  { key: 'musicfile', en: 'Music file', ko: '음악 파일' },
  { key: 'hyperframes', en: 'Render with HyperFrames', ko: 'HyperFrames 로 렌더' },
  { key: 'numbers', en: 'Numbers', ko: '숫자' },
] as const;

const LABEL_TO_KEY: Record<string, string> = Object.fromEntries(
  [...FIELD_KEYS, ...TOGGLE_KEYS].flatMap((f) => [[f.en, f.key], [f.ko, f.key]]),
);

const PH = /\{\{([?-]?)([^=}]+)=([^}]*)\}\}/g;
const keyOf = (label: string) => LABEL_TO_KEY[label.trim()] ?? label.trim();

export function parsePlaceholders(src: string): Record<string, Placeholder> {
  const out: Record<string, Placeholder> = {};
  for (const m of src.matchAll(PH)) {
    const key = keyOf(m[2] ?? '');
    out[key] = { key, flag: (m[1] ?? '') as Placeholder['flag'], label: (m[2] ?? '').trim(), def: m[3] ?? '' };
  }
  return out;
}

// 선택 항목 기본값은 프롬프트의 기호(? 켬, - 끔)를 따르고, 사용자가 누른 값이 있으면 그것이 우선한다.
export function isToggleOn(key: string, flag: string, toggles: Record<string, boolean>): boolean {
  return key in toggles ? Boolean(toggles[key]) : flag === '?';
}

function renderLine(line: string, state: PromptState): Segment[] {
  const segs: Segment[] = [];
  let last = 0;
  for (const m of line.matchAll(PH)) {
    if (m.index > last) segs.push({ text: line.slice(last, m.index) });
    const flag = m[1] ?? '';
    const key = keyOf(m[2] ?? '');
    const def = m[3] ?? '';
    if (flag) {
      segs.push({ text: def, mark: isToggleOn(key, flag, state.toggles) ? 'on' : 'off' });
    } else {
      const v = state.values[key];
      segs.push({ text: v ? v : def, mark: 'value' });
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) segs.push({ text: line.slice(last) });
  return segs;
}

const plain = (segs: Segment[]) => segs.filter((s) => s.mark !== 'off').map((s) => s.text).join('');

// 꺼진 선택 항목만 있던 "- " 목록 줄은 통째로 뺀다.
export function renderLines(src: string, state: PromptState): Segment[][] {
  return src.split('\n').map((l) => renderLine(l, state)).filter((segs) => plain(segs) !== '- ');
}

export function renderPrompt(src: string, state: PromptState): string {
  return renderLines(src, state).map(plain).join('\n');
}

const mdCell = (v: string) => v.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (cols: string[], rows: string[][]) =>
  `| ${cols.join(' | ')} |\n| --- | --- | --- |\n` + rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`).join('\n');

export function tablesMarkdown(item: Pick<MotionAdmin, 'shots' | 'cues'>, lang: PromptLang): string {
  const en = lang === 'en';
  const h1 = en ? "## 8. Shot list (director's intent)" : '## 8. 장면표 (감독의 의도)';
  const h2 = en ? '## 9. Sound cue sheet' : '## 9. 소리 큐 시트';
  const c1 = en ? ['Time (s)', 'Scene', 'Why'] : ['시간(초)', '장면', '왜 이렇게'];
  const c2 = en ? ['Time (s)', 'Sound', 'Visual event'] : ['시각(초)', '소리', '화면 이벤트'];
  const note = en
    ? 'Keep the order and timing below within ±0.2 s; refine details, do not replace them.'
    : '아래 순서와 시각을 ±0.2 s 안에서 지키고, 세부만 다듬는다. 대체하지 않는다.';
  return `\n\n${h1}\n${note}\n\n${table(c1, item.shots)}\n\n${h2}\n\n${table(c2, item.cues)}\n`;
}

export function finalPrompt(item: MotionAdmin, lang: PromptLang, state: PromptState): string {
  const body = renderPrompt(lang === 'ko' ? item.ko : item.prompt, state);
  return body + (state.withTables ? tablesMarkdown(item, lang) : '');
}
