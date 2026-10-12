import type { Locale, Profile, Ui } from '@me/content';
import { AI_HOME } from '@/lib/ai-paths';
import { AI_TABS } from '@/lib/ai-tabs';
import { Section } from '../Section';

const item = 'inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent';

export function Contact({ profile, ui, locale }: { profile: Profile; ui: Ui; locale: Locale }) {
  return (
    <Section id="contact" title={ui.sections.contact}>
      <div className="flex flex-wrap gap-2">
        <a href={`mailto:${profile.links.email}`} className={item}><span className="text-muted">{ui.contact.email}</span>{profile.links.email}</a>
        <a href={profile.links.github} target="_blank" rel="noreferrer" className={item}><span className="text-muted">{ui.contact.github}</span>ChoisMath ↗</a>
        {profile.links.sites.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className={item}><span className="text-muted">{ui.contact.sites}</span>{s.label} ↗</a>
        ))}
        <a href={AI_HOME} className={`${item} max-w-full`}><span className="text-muted">{ui.nav.ai}</span><span className="truncate">{AI_TABS.map((t) => t.label[locale]).join(' · ')}</span>→</a>
      </div>
    </Section>
  );
}
