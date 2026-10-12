import Link from 'next/link';
import type { Locale, Ui } from '@me/content';
import { AI_MOTION } from '@/lib/ai-paths';
import { AI_TABS } from '@/lib/ai-tabs';
import type { MotionCardData } from '@/lib/media';
import { Section } from '../Section';
import { MotionCard } from '../motion-gallery/MotionCard';

export function AiHub({ items, ui, locale }: { items: MotionCardData[]; ui: Ui; locale: Locale }) {
  return (
    <Section id="ai" title={ui.sections.ai}>
      {/* 예전 공유 링크 /#motion 이 이 섹션으로 오도록 남겨 둔 앵커 */}
      <span id="motion" aria-hidden className="block scroll-mt-[var(--nav-h)]" />
      <p className="mb-4 text-muted">{ui.ai.intro}</p>
      <ul className="-mx-2 mb-4 flex gap-2 overflow-x-auto px-2 whitespace-nowrap">
        {AI_TABS.map((t, i) => (
          <li key={t.id}>
            <Link href={t.href} className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm whitespace-nowrap ${i === 0 ? 'border-fg bg-fg text-bg' : 'border-line hover:border-accent'}`}>
              {t.label[locale]}
            </Link>
          </li>
        ))}
      </ul>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {items.map((m) => (
          <li key={m.id}>
            <MotionCard item={m} label={locale === 'en' ? m.en : m.name} subtitle={locale === 'en' ? null : undefined} />
          </li>
        ))}
      </ul>
      <Link href={AI_MOTION} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent">
        {ui.motion.viewAll} →
      </Link>
    </Section>
  );
}
