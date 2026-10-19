export const AI_HOME = '/ai/';
export const AI_MOTION = '/ai/motion/';
export const AI_SLIDE = '/ai/slide/';
export const AI_BRAND = '/ai/brand/';
export const AI_BRAND_SITE = '/ai/brand/site/';
export const AI_MOTION_ADMIN = '/ai/motion/admin/';
export const AI_JOIN = '/ai/join/';
export const AI_MEMBERS = '/ai/admin/members/';
export const AI_SIGNIN_ERROR = '/ai/signin-error/';

export const aiMotionPath = (id: string) => `${AI_MOTION}${id}/`;
export const aiMotionAdminPath = (id: string) => `${AI_MOTION_ADMIN}${id}/`;

// 로그인 뒤 돌아갈 곳은 허브 안 경로와 홈만 허용한다(열린 리다이렉트 방지). 권한은 도착한 페이지가 다시 판정한다.
const RETURN_PATH = /^\/ai\/(?:[a-z0-9-]+\/){0,3}$/;
const HOME_PATH = /^\/(?:en\/)?$/;

export function safeReturnPath(raw: unknown): string {
  return typeof raw === 'string' && (RETURN_PATH.test(raw) || HOME_PATH.test(raw)) ? raw : AI_MOTION;
}

export function joinPath(from?: unknown): string {
  return `${AI_JOIN}?from=${encodeURIComponent(safeReturnPath(from))}`;
}

const PUBLIC_AI = /^\/ai\/(?:motion\/(?:[a-z0-9-]+\/)?|slide\/|brand\/)$/;

// 공개 화면에서 로그아웃하면 그 자리에 남고, 권한이 필요한 화면에서는 갤러리로 나간다.
export function signOutReturnPath(raw: unknown): string {
  if (raw === '/' || raw === '/en/') return raw;
  if (typeof raw !== 'string') return '/';
  if (PUBLIC_AI.test(raw) && !raw.startsWith(AI_MOTION_ADMIN)) return raw;
  return RETURN_PATH.test(raw) ? AI_MOTION : '/';
}
