import type { Stats as StatsData, Ui } from '@me/content';
import { Section } from '../Section';

const KEYS = ['years', 'lectures', 'books', 'services', 'awards'] as const;

export function Stats({ stats, ui }: { stats: StatsData; ui: Ui }) {
  return (
    <Section id="stats" title={ui.sections.stats}>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {KEYS.map((k) => (
          <div key={k} className="rounded-[var(--radius-card)] border border-line p-4">
            <dd className="font-mono text-4xl font-bold text-accent" data-count={stats[k]}>{stats[k]}</dd>
            <dt className="mt-1 text-sm whitespace-nowrap text-muted">{ui.stats[k]}</dt>
          </div>
        ))}
      </dl>
    </Section>
  );
}
