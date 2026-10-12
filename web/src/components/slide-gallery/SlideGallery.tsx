'use client';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { SlideFamily } from '@me/content';
import type { SlidePromptAccess } from '@/lib/access';
import type { SlideCardData } from '@/lib/slides';
import { SlideCard } from './SlideCard';
import { SlideSortMenu } from './SlideSortMenu';
import { SlideViewer } from './SlideViewer';
import { setHashId, useHashId } from './slide-hash';
import { arrange, parseQuery, pickOrder, toSearch, type GalleryQuery, type ViewerPos } from './slide-order';

type Family = { readonly key: SlideFamily; readonly label: string };
type Props = { items: SlideCardData[]; families: readonly Family[]; access: SlidePromptAccess };

const chip = 'min-h-11 shrink-0 rounded-full border px-4 text-sm whitespace-nowrap';
const VIEWS = [{ key: 'cover', label: '표지' }, { key: 'body', label: '본문' }] as const;

export function SlideGallery({ items, families, access }: Props) {
  const present = families.filter((f) => items.some((i) => i.family === f.key));
  // URL 이 거르기·정렬·보기의 유일한 진실 공급원이다(새로고침·공유해도 같은 화면).
  const query = parseQuery(useSearchParams(), present.map((f) => f.key));
  const shown = arrange(items, query);
  const hashId = useHashId();
  const [slideOf, setSlideOf] = useState<{ id: string; k: number }>({ id: '', k: 0 });

  const order = pickOrder(items, query, hashId);
  const styleIndex = order.findIndex((s) => s.id === hashId);
  const pos: ViewerPos | null = styleIndex < 0 ? null : { style: styleIndex, slide: slideOf.id === hashId ? slideOf.k : 0 };

  const update = (patch: Partial<GalleryQuery>) => {
    history.replaceState(null, '', `${location.pathname}${toSearch({ ...query, ...patch })}`);
  };
  const open = (id: string, k = 0) => {
    setSlideOf({ id, k });
    setHashId(id);
  };
  const labelOf = (key: SlideFamily) => families.find((f) => f.key === key)?.label ?? key;
  const countOf = (key: SlideFamily | null) => (key ? items.filter((i) => i.family === key).length : items.length);

  return (
    <div data-testid="slide-gallery">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div role="toolbar" aria-label="분류로 거르기" data-testid="slide-chips" className="-mx-2 flex min-w-0 flex-1 gap-2 overflow-x-auto px-2 pb-1">
          {[null, ...present].map((f) => {
            const key = f?.key ?? null;
            const isOn = query.family === key;
            return (
              <button key={key ?? 'all'} type="button" aria-pressed={isOn} onClick={() => update({ family: key })} className={`${chip} ${isOn ? 'border-fg bg-fg text-bg' : 'border-line'}`}>
                {f?.label ?? '전체'} <span className="font-mono text-xs opacity-70">{countOf(key)}</span>
              </button>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SlideSortMenu value={query.sort} onChange={(sort) => update({ sort })} />
          <div role="group" aria-label="목록에 보여 줄 장" data-testid="slide-view" className="flex rounded-full border border-line p-0.5">
            {VIEWS.map((v) => (
              <button key={v.key} type="button" aria-pressed={query.view === v.key} onClick={() => update({ view: v.key })} className={`min-h-11 rounded-full px-4 text-sm whitespace-nowrap ${query.view === v.key ? 'bg-fg text-bg' : ''}`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p role="status" className="sr-only">{`${shown.length}개 스타일`}</p>
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((s) => (
          <li key={s.id}>
            <SlideCard item={s} view={query.view} familyLabel={labelOf(s.family)} onOpen={() => open(s.id)} />
          </li>
        ))}
      </ol>
      {pos ? (
        <SlideViewer
          list={order}
          pos={pos}
          onMove={(next) => {
            const id = order[next.style]?.id;
            if (id) open(id, next.slide);
          }}
          onClose={() => setHashId(null)}
          familyLabel={labelOf}
          access={access}
        />
      ) : null}
    </div>
  );
}
