import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokensSchema, type Tokens } from '../content/schema';
import rawTokens from '../content/tokens.json';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

export function tokensToCss(tokens: Tokens): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(tokens.color)) lines.push(`  --color-${kebab(k)}: ${v};`);
  lines.push(`  --font-sans: ${tokens.font.sans};`);
  lines.push(`  --font-mono: ${tokens.font.mono};`);
  lines.push(`  --radius-card: ${tokens.radius.card};`);
  return `/* generated from content/tokens.json — edit the JSON, not this file */\n@theme {\n${lines.join('\n')}\n}\n`;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const out = path.resolve(here, '../web/src/app/tokens.css');
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, tokensToCss(tokensSchema.parse(rawTokens)));
  console.info(`wrote ${out}`);
}
