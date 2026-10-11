'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function KeyNav({ prevHref, nextHref }: { prevHref: string | null; nextHref: string | null }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 입력 중이거나 영상에 포커스가 있으면 브라우저 기본 동작(커서 이동·탐색)을 지킨다.
      const t = e.target;
      if (e.altKey || e.ctrlKey || e.metaKey || t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLVideoElement) return;
      if (e.key === 'ArrowLeft' && prevHref) router.push(prevHref);
      if (e.key === 'ArrowRight' && nextHref) router.push(nextHref);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prevHref, nextHref, router]);
  return null;
}
