'use client';
import { useState } from 'react';
import type { MotionCardData } from '@/lib/media';
import { MotionCard } from './MotionCard';

type Props = { items: MotionCardData[]; groups: readonly string[]; allLabel: string; initialGroup: string | null };

export function MotionGallery({ items, groups, allLabel, initialGroup }: Props) {
  const present = groups.filter((g) => items.some((m) => m.group === g));
  const [group, setGroup] = useState<string | null>(initialGroup && present.includes(initialGroup) ? initialGroup : null);
  const shown = group ? items.filter((m) => m.group === group) : items;
  const choose = (g: string | null) => {
    setGroup(g);
    history.replaceState(null, '', g ? `?g=${encodeURIComponent(g)}` : location.pathname);
  };
  return (
    <>
      <div role="toolbar" aria-label="group filter" className="-mx-2 mb-4 flex gap-2 overflow-x-auto px-2 pb-1">
        {[null, ...present].map((g) => (
          <button
            key={g ?? 'all'}
            type="button"
            aria-pressed={group === g}
            onClick={() => choose(g)}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm whitespace-nowrap ${group === g ? 'border-fg bg-fg text-bg' : 'border-line'}`}
          >
            {g ?? allLabel} <span className="font-mono text-xs opacity-70">{g ? items.filter((m) => m.group === g).length : items.length}</span>
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {shown.map((m) => (
          <li key={m.id}>
            <MotionCard item={m} label={m.name} />
          </li>
        ))}
      </ul>
    </>
  );
}
