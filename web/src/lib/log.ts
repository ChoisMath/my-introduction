// 오류 객체에는 쿼리 인자(이메일)가 실릴 수 있어 이름과 Prisma 코드만 남긴다.
export function errorTag(error: unknown): string {
  const name = error instanceof Error ? error.name : 'unknown';
  const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? ` ${error.code}` : '';
  return `${name}${code}`;
}
