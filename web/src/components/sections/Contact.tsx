import type { Profile, Ui } from '@me/content';
import { Section } from '../Section';

const item = 'inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent';

export function Contact({ profile, ui }: { profile: Profile; ui: Ui }) {
  return (
    <Section id="contact" title={ui.sections.contact}>
      <div className="flex flex-wrap gap-2">
        <a href={`mailto:${profile.links.email}`} className={item}><span className="text-muted">{ui.contact.email}</span>{profile.links.email}</a>
        <a href={profile.links.github} target="_blank" rel="noreferrer" className={item}><span className="text-muted">{ui.contact.github}</span>ChoisMath ↗</a>
        {profile.links.sites.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className={item}><span className="text-muted">{ui.contact.sites}</span>{s.label} ↗</a>
        ))}
      </div>
    </Section>
  );
}
