import { describe, expect, it } from 'vitest';
import { downloadablePath } from './media-download';

describe('downloadablePath', () => {
  it('내려받기는 업로드 허용 목록과 같은 경로만 연다', () => {
    expect(downloadablePath('private/motion-admin.json')).toBe(true);
    expect(downloadablePath('private/slide-admin.json')).toBe(true);
    expect(downloadablePath('media/motion/manifest.json')).toBe(true);
  });
  it('목록 밖이거나 상위 경로로 빠지는 값은 거부한다', () => {
    expect(downloadablePath('../x')).toBe(false);
    expect(downloadablePath('private/members.json')).toBe(false);
    expect(downloadablePath('')).toBe(false);
  });
});
