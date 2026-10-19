import { describe, expect, it } from 'vitest';
import { BRAND_EMBED_STYLE, embedBrandHtml } from './brand-embed';

describe('embedBrandHtml', () => {
  it('puts the override style just before </head>', () => {
    const out = embedBrandHtml('<!doctype html><html><head><title>x</title></head><body class="a" data-view="index">hi</body></html>');
    expect(out.indexOf(BRAND_EMBED_STYLE)).toBeGreaterThan(out.indexOf('<title>'));
    expect(out.indexOf(BRAND_EMBED_STYLE)).toBeLessThan(out.indexOf('</head>'));
    expect(out.match(/data-chois-embed/g)).toHaveLength(1);
  });
  it('falls back to before <body>, then to the very start', () => {
    expect(embedBrandHtml('<!doctype html><title>b</title><body><h1>m</h1></body>').indexOf(BRAND_EMBED_STYLE)).toBeLessThan('<!doctype html><title>b</title>'.length + 1);
    expect(embedBrandHtml('<p>plain</p>').startsWith(BRAND_EMBED_STYLE)).toBe(true);
  });
  it('hides the shell but not the filter sidebar or the detail title band', () => {
    expect(BRAND_EMBED_STYLE).toContain('.aih-side,');
    expect(BRAND_EMBED_STYLE).toContain('body[data-view="index"] .otl-band--content');
    expect(BRAND_EMBED_STYLE).not.toMatch(/#sidebar|\.otl-toolbar|\.sidebar\b/);
  });
});
