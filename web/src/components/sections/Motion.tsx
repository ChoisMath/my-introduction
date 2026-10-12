import Link from 'next/link';
import type { Locale, Ui } from '@me/content';
import type { MotionCardData } from '@/lib/media';
import { Section } from '../Section';
import { MotionCard } from '../motion-gallery/MotionCard';
import { AI_MOTION } from '@/lib/ai-paths';

export function Motion({ items, ui, locale }: { items: MotionCardData[]; ui: Ui; locale: Locale }) {
  return (
    <Section id="motion" title={ui.sections.motion}>
      <p className="mb-4 text-muted">{ui.motion.intro}</p>
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
