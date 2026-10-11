import { describe, expect, it } from 'vitest';
import { finalPrompt, isToggleOn, parsePlaceholders, renderLines, renderPrompt, tablesMarkdown, type PromptState } from './placeholders';

const src = [
  '## 1. Channel',
  '- Name: {{Channel name=Chois의 바이브코딩}}',
  '- {{?Logo=Use the pixel portrait}}',
  '- {{-Numbers=Show real numbers}}',
  'Length {{Length=10 s}}',
].join('\n');
const base: PromptState = { values: {}, toggles: {}, withTables: false };

describe('parsePlaceholders', () => {
  it('maps english and korean labels to the same keys', () => {
    expect(parsePlaceholders(src)).toMatchObject({
      name: { flag: '', def: 'Chois의 바이브코딩' },
      logo: { flag: '?', def: 'Use the pixel portrait' },
      numbers: { flag: '-', def: 'Show real numbers' },
      length: { flag: '', def: '10 s' },
    });
    expect(parsePlaceholders('{{채널 이름=A}}').name?.def).toBe('A');
  });
});

describe('isToggleOn', () => {
  it('follows the prompt flag unless the user toggled', () => {
    expect(isToggleOn('logo', '?', {})).toBe(true);
    expect(isToggleOn('numbers', '-', {})).toBe(false);
    expect(isToggleOn('numbers', '-', { numbers: true })).toBe(true);
  });
});

describe('renderPrompt', () => {
  it('fills defaults and drops lines whose only content was an off option', () => {
    expect(renderPrompt(src, base)).toBe(['## 1. Channel', '- Name: Chois의 바이브코딩', '- Use the pixel portrait', 'Length 10 s'].join('\n'));
  });
  it('uses edited values and toggles', () => {
    const out = renderPrompt(src, { ...base, values: { name: '내 채널', length: '' }, toggles: { logo: false, numbers: true } });
    expect(out).toBe(['## 1. Channel', '- Name: 내 채널', '- Show real numbers', 'Length 10 s'].join('\n'));
  });
  it('marks segments for highlighting', () => {
    const lines = renderLines('- {{-Numbers=N}} and {{Length=10 s}}', base);
    expect(lines[0]).toEqual([{ text: '- ' }, { text: 'N', mark: 'off' }, { text: ' and ' }, { text: '10 s', mark: 'value' }]);
  });
});

describe('tables', () => {
  const item = { id: '11-rpg', prompt: src, ko: '## 1. 채널\n- 이름: {{채널 이름=Chois}}', shots: [['0.0–1.0', 'a|b', 'why']] as [string, string, string][], cues: [['0.000', 'kick', 'first\nframe']] as [string, string, string][] };
  it('renders escaped markdown tables', () => {
    const md = tablesMarkdown(item, 'en');
    expect(md).toContain('## 8. Shot list (director\'s intent)');
    expect(md).toContain('| 0.0–1.0 | a\\|b | why |');
    expect(md).toContain('| 0.000 | kick | first frame |');
    expect(tablesMarkdown(item, 'ko')).toContain('## 9. 소리 큐 시트');
  });
  it('appends tables only when enabled and uses the chosen language', () => {
    expect(finalPrompt(item, 'ko', base)).toBe('## 1. 채널\n- 이름: Chois');
    expect(finalPrompt(item, 'en', { ...base, withTables: true })).toContain('## 9. Sound cue sheet');
  });
});
