import type { SlideCardData } from '@/lib/slides';
import type { ViewKey } from './slide-order';

export function SlideCard({ item, view, familyLabel, onOpen }: {
  item: SlideCardData;
  view: ViewKey;
  familyLabel: string;
  onOpen: () => void;
}) {
  const [front, back] = view === 'cover' ? [item.coverCard, item.bodyCard] : [item.bodyCard, item.coverCard];
  return (
    <button type="button" onClick={onOpen} data-testid={`slide-card-${item.id}`} className="group block w-full text-left">
      <span className="relative block aspect-video overflow-hidden rounded-lg border border-line bg-grid">
        {/* eslint-disable-next-line @next/next/no-img-element -- Volume 에서 스트리밍하는 버전 URL 이라 next/image 대상이 아니다 */}
        <img data-testid="slide-card-front" src={front} alt={`${item.name} ${view === 'cover' ? '표지' : '본문'}`} width={760} height={424} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element -- 위와 같음 */}
        <img src={back} alt="" aria-hidden="true" width={760} height={424} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />
      </span>
      <span className="mt-1.5 flex min-w-0 items-baseline gap-2">
        <span className="font-mono text-xs text-muted">{item.no}</span>
        <span className="min-w-0 overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap" title={item.name}>{item.name}</span>
        <span className="ml-auto shrink-0 text-xs whitespace-nowrap text-muted">{familyLabel}</span>
      </span>
    </button>
  );
}
