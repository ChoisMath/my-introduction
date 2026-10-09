import Image from 'next/image';
import type { Project, Ui } from '@me/content';
import { Section } from '../Section';
import { Reveal } from '../motion/Reveal';

const linkClass = 'inline-flex min-h-11 items-center rounded-full border border-dark-muted px-3 text-sm whitespace-nowrap hover:border-dark-accent hover:text-dark-accent';

export function Projects({ projects, ui }: { projects: Project[]; ui: Ui }) {
  return (
    <Section id="projects" title={ui.sections.projects} dark>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p, i) => (
          <li key={p.id} className="h-full">
          <Reveal delay={i * 0.06} className="h-full">
          <article className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-dark-surface" data-testid="project-card">
            <Image src={p.mockup} alt={`${p.name} mockup`} width={1200} height={750} className="aspect-[16/10] w-full object-cover" />
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className="text-sm text-dark-muted">{p.tagline}</p>
              {p.description ? <p className="text-sm">{p.description}</p> : null}
              <ul className="flex flex-wrap gap-1" aria-label={ui.projects.stack}>
                {p.stack.map((s) => <li key={s} className="rounded-full bg-dark-bg px-2 py-0.5 font-mono text-xs whitespace-nowrap">{s}</li>)}
              </ul>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                {p.url ? <a href={p.url} target="_blank" rel="noreferrer" className={linkClass}>{ui.projects.visit} ↗</a> : null}
                {p.youtubeId ? <a href={`https://www.youtube.com/watch?v=${p.youtubeId}`} target="_blank" rel="noreferrer" className={linkClass}>▶ {ui.projects.watch}</a> : null}
                {p.urlNote ? <span className="text-xs whitespace-nowrap text-dark-muted">{p.urlNote}</span> : null}
              </div>
            </div>
          </article>
          </Reveal>
          </li>
        ))}
      </ul>
    </Section>
  );
}
