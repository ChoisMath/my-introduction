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
