import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_PATH, MANIFEST_PATH, SLIDE_ADMIN_PATH, SLIDE_MANIFEST_PATH, VolumeError, isServablePath, isUploadablePath, resolveIn, volumeRoot } from './volume';

describe('volume paths', () => {
  it('serves only motion media files', () => {
    expect(isServablePath('media/motion/11-rpg/video.mp4')).toBe(true);
    expect(isServablePath('media/motion/11-rpg/preview.mp4')).toBe(true);
    expect(isServablePath('media/motion/11-rpg/poster.webp')).toBe(true);
    expect(isServablePath(MANIFEST_PATH)).toBe(false);
    expect(isServablePath(ADMIN_PATH)).toBe(false);
    expect(isServablePath('media/motion/../private/motion-admin.json')).toBe(false);
    expect(isServablePath('media/motion/11-rpg/other.mp4')).toBe(false);
    expect(isServablePath('/etc/passwd')).toBe(false);
  });
  it('uploads media, manifest and the admin file only', () => {
    expect(isUploadablePath('media/motion/11-rpg/video.mp4')).toBe(true);
    expect(isUploadablePath(MANIFEST_PATH)).toBe(true);
    expect(isUploadablePath(ADMIN_PATH)).toBe(true);
    expect(isUploadablePath('private/other.json')).toBe(false);
    expect(isUploadablePath('media/motion/x/video.mp4')).toBe(false);
  });
  it('serves slide images in all three sizes and nothing else under media/slide', () => {
    expect(isServablePath('media/slide/24/1.webp')).toBe(true);
    expect(isServablePath('media/slide/135/12.webp')).toBe(true);
    expect(isServablePath('media/slide/24/s/8.webp')).toBe(true);
    expect(isServablePath('media/slide/24/t/4.webp')).toBe(true);
    expect(isServablePath(SLIDE_MANIFEST_PATH)).toBe(false);
    expect(isServablePath(SLIDE_ADMIN_PATH)).toBe(false);
    expect(isServablePath('media/slide/24/x/1.webp')).toBe(false);
    expect(isServablePath('media/slide/24/1.png')).toBe(false);
    expect(isServablePath('media/slide/7/1.webp')).toBe(false);
    expect(isServablePath('media/slide/24/../../private/slide-admin.json')).toBe(false);
  });
  it('uploads slide manifest and admin file', () => {
    expect(isUploadablePath('media/slide/24/t/1.webp')).toBe(true);
    expect(isUploadablePath(SLIDE_MANIFEST_PATH)).toBe(true);
    expect(isUploadablePath(SLIDE_ADMIN_PATH)).toBe(true);
  });
  it('refuses to resolve outside the root', () => {
    expect(resolveIn('/data', 'media/motion/11-rpg/video.mp4')).toBe(path.join('/data', 'media/motion/11-rpg/video.mp4'));
    expect(() => resolveIn('/data', '../etc/passwd')).toThrow(VolumeError);
    expect(() => resolveIn('/data', '/etc/passwd')).toThrow(VolumeError);
  });
});

describe('volumeRoot', () => {
  const saved = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  afterEach(() => { process.env.RAILWAY_VOLUME_MOUNT_PATH = saved; });
  it('throws when the env var is missing', () => {
    delete process.env.RAILWAY_VOLUME_MOUNT_PATH;
    expect(() => volumeRoot()).toThrow(VolumeError);
  });
  it('resolves a relative path', () => {
    process.env.RAILWAY_VOLUME_MOUNT_PATH = './.local-volume';
    expect(path.isAbsolute(volumeRoot())).toBe(true);
  });
  it('rejects a relative path in production', () => {
    process.env.RAILWAY_VOLUME_MOUNT_PATH = './.local-volume';
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => volumeRoot()).toThrow(VolumeError);
    process.env.RAILWAY_VOLUME_MOUNT_PATH = '/data';
    expect(volumeRoot()).toBe('/data');
    vi.unstubAllEnvs();
  });
});
