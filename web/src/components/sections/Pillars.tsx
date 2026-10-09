import type { Profile, Ui } from '@me/content';
import { Section } from '../Section';
import { Reveal } from '../motion/Reveal';

export function Pillars({ profile, ui }: { profile: Profile; ui: Ui }) {
  return (
    <Section id="pillars" title={ui.sections.pillars}>
      <div className="grid gap-2 md:grid-cols-3">
        {profile.pillars.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.05} className="h-full">
          <article className="h-full rounded-[var(--radius-card)] border border-line p-5">
            <p className="font-mono text-xs text-accent">0{i + 1}</p>
            <h3 className="mt-1 text-xl font-bold">{p.title}</h3>
            <p className="mt-2 text-sm text-muted">{p.summary}</p>
            <ul className="mt-4 space-y-1 text-sm">
              {p.items.map((it) => <li key={it} className="flex gap-2"><span className="text-accent">•</span><span>{it}</span></li>)}
            </ul>
          </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
