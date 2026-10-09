import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// "교직 N년차"는 빌드 시각에 계산되므로 매년 3월 1일(임용 기념일)에 재배포가 돌아야 한다.
describe('deploy workflow', () => {
  const yml = readFileSync(path.resolve(__dirname, '../../.github/workflows/deploy.yml'), 'utf-8');
  it('rebuilds on a yearly schedule after the March anniversary', () => {
    expect(yml).toMatch(/schedule:\s*\n\s*-\s*cron:\s*['"]0 0 1 3 \*['"]/);
  });
});

describe('deploy workflow matches local verification', () => {
  const yml = readFileSync(path.resolve(__dirname, '../../.github/workflows/deploy.yml'), 'utf-8');
  it('runs the same npm run check as local', () => {
    expect(yml).toContain('run: npm run check');
  });
  it('does not cancel an in-progress Pages deployment', () => {
    expect(yml).toMatch(/cancel-in-progress:\s*false/);
  });
});
