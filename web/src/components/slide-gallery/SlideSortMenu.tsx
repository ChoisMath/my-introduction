'use client';
import { useEffect, useRef, useState } from 'react';
import type { SortKey } from './slide-order';

const LABEL: Record<SortKey, string> = { pop: '인기순', no: '번호순', new: '최신순' };

export function SlideSortMenu({ value, onChange }: { value: SortKey; onChange: (sort: SortKey) => void }) {
  const [isOpen, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  return (
    <div ref={box} className="relative" data-testid="slide-sort">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setOpen(!isOpen)}
        className="inline-flex min-h-11 items-center gap-1 rounded-full border border-line px-4 text-sm whitespace-nowrap"
      >
        <span className="sr-only">정렬: </span>
        {LABEL[value]}
        <span aria-hidden="true">▾</span>
      </button>
      {isOpen ? (
        <div role="menu" className="absolute right-0 z-10 mt-1 flex min-w-32 flex-col rounded-xl border border-line bg-bg p-1 shadow-lg">
          {(Object.keys(LABEL) as SortKey[]).map((key) => (
            <button
              key={key}
              type="button"
              role="menuitemradio"
              aria-checked={value === key}
              onClick={() => {
                onChange(key);
                setOpen(false);
              }}
              className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-sm whitespace-nowrap hover:bg-accent-soft aria-checked:font-semibold"
            >
              <span aria-hidden="true" className="w-3">{value === key ? '✓' : ''}</span>
              {LABEL[key]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
