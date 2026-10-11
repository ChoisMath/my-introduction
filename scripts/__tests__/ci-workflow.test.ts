import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');

describe('ci workflow', () => {
  const yml = readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf-8');
  it('runs the same checks as local, then builds and runs e2e', () => {
    expect(yml).toContain('run: npm run check');
    expect(yml).toContain('run: npm run build:web');
    expect(yml).toContain('run: npm run e2e');
  });
  it('builds the production docker image without pushing', () => {
    expect(yml).toMatch(/\n  docker:\n/);
    expect(yml).toContain('run: docker build -t me-chois .');
    expect(yml).not.toContain('docker push');
  });
  it('no longer deploys to GitHub Pages', () => {
    expect(existsSync(path.join(root, '.github/workflows/deploy.yml'))).toBe(false);
    expect(yml).not.toContain('deploy-pages');
  });
});

describe('railway config', () => {
  const cfg = JSON.parse(readFileSync(path.join(root, 'railway.json'), 'utf-8'));
  it('builds with the Dockerfile and checks health', () => {
    expect(cfg.build.builder).toBe('DOCKERFILE');
    expect(cfg.deploy.healthcheckPath).toBe('/api/health');
  });
});
