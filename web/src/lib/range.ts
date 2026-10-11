export type ByteRange = { start: number; end: number };

// 단일 범위만 지원한다. 형식이 틀리거나 다중 범위면 RFC 9110 대로 무시하고(null) 전체를 보낸다.
export function parseRange(header: string | null, size: number): ByteRange | 'unsatisfiable' | null {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  const [, a = '', b = ''] = m;
  if (a === '' && b === '') return null;
  if (a === '') {
    const suffix = Number(b);
    if (suffix === 0 || size === 0) return 'unsatisfiable';
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(a);
  if (start >= size) return 'unsatisfiable';
  const end = b === '' ? size - 1 : Math.min(Number(b), size - 1);
  if (end < start) return null;
  return { start, end };
}
