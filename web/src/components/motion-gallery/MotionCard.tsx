'use client';
import Link from 'next/link';
import { useRef } from 'react';
import type { MotionCardData } from '@/lib/media';

export function MotionCard({ item, label, href }: { item: MotionCardData; label: string; href?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  // 터치 기기는 호버가 없으므로 미리보기를 받지 않고 탭하면 바로 상세로 간다.
  const play = () => {
    const v = video.current;
    if (!v || !item.preview || !window.matchMedia('(hover: hover)').matches) return;
    if (!v.getAttribute('src')) v.src = item.preview;
    v.play().catch(() => {});
  };
  const stop = () => {
    const v = video.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };
  return (
    <Link
      href={href ?? `/motion/${item.id}/`}
      data-testid="motion-card"
      onMouseEnter={play}
      onMouseLeave={stop}
      onFocus={play}
      onBlur={stop}
      className="group block h-full overflow-hidden rounded-[var(--radius-card)] border border-line bg-bg hover:border-accent"
    >
      <div className="relative aspect-video bg-line">
        {/* eslint-disable-next-line @next/next/no-img-element -- Volume 에서 스트리밍하는 버전 URL 이라 next/image 대상이 아니다 */}
        <img src={item.poster} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        {item.preview ? (
          <video ref={video} muted loop playsInline preload="none" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity group-hover:opacity-100" />
        ) : null}
      </div>
      <div className="flex items-baseline gap-2 px-2 pt-2">
        <span className="font-mono text-xs text-muted">{String(item.no).padStart(2, '0')}</span>
        <span className="min-w-0 overflow-hidden text-sm font-bold text-ellipsis whitespace-nowrap" title={label}>{label}</span>
      </div>
      <p className="overflow-hidden px-2 pb-2 text-xs text-ellipsis whitespace-nowrap text-muted" title={item.use}>{item.use}</p>
    </Link>
  );
}
