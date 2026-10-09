import type { Stats as StatsData, Ui } from '@me/content';
import { Section } from '../Section';
import { CountUp } from '../motion/CountUp';

const KEYS = ['years', 'lectures', 'books', 'services', 'awards'] as const;

export function Stats({ stats, ui }: { stats: StatsData; ui: Ui }) {
  return (
    <Section id="stats" title={ui.sections.stats}>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {KEYS.map((k) => (
          <div key={k} className="flex flex-col-reverse rounded-[var(--radius-card)] border border-line p-4">
            <dt className="mt-1 text-sm whitespace-nowrap text-muted">{ui.stats[k]}</dt>
            <dd className="font-mono text-4xl font-bold text-accent"><CountUp value={stats[k]} /></dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
