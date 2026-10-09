import { describe, expect, it } from 'vitest';
import { tokensToCss } from '../gen-tokens-css';
import tokens from '../../content/tokens.json';

describe('tokensToCss', () => {
  const css = tokensToCss(tokens);
  it('emits a @theme block with kebab-case color variables', () => {
    expect(css).toContain('@theme {');
    expect(css).toContain('--color-accent: #1D3C77;');
    expect(css).toContain('--color-dark-bg: #0B1220;');
    expect(css).toContain('--color-accent-soft: #E8EEF8;');
  });
  it('emits font and radius variables', () => {
    expect(css).toContain("--font-sans: 'Pretendard Variable'");
    expect(css).toContain('--radius-card: 16px;');
  });
  it('starts with a generated-file notice', () => {
    expect(css.startsWith('/* generated from content/tokens.json')).toBe(true);
  });
});
