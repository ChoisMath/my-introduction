'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@me/content';
import { AI_TABS, activeTabId } from '@/lib/ai-tabs';

export function AiTabs({ locale }: { locale: Locale }) {
  const active = activeTabId(usePathname());
  return (
    <nav aria-label="AI활용" className="-mx-2 min-w-0 overflow-x-auto px-2">
      <ul className="flex gap-2 whitespace-nowrap">
        {AI_TABS.map((t) => (
          <li key={t.id}>
            <Link
              href={t.href}
              aria-current={t.id === active ? 'page' : undefined}
              className={`inline-flex min-h-8 items-center rounded-full border px-3 text-sm whitespace-nowrap ${t.id === active ? 'border-fg bg-fg text-bg' : 'border-line hover:border-accent'}`}
            >
              {t.label[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
