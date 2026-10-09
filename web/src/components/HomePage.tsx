import { computeStats, getContent, type Locale } from '@me/content';
import { Section } from './Section';
import { Hero } from './sections/Hero';
import { Stats } from './sections/Stats';
import { Timeline } from './sections/Timeline';
import { Pillars } from './sections/Pillars';
import { Projects } from './sections/Projects';
import { Books } from './sections/Books';

export function HomePage({ locale }: { locale: Locale }) {
  const content = getContent(locale);
  const { profile, ui } = content;
  const stats = computeStats(content);
  return (
    <>
      <Hero profile={profile} ui={ui} />
      <Stats stats={stats} ui={ui} />
      <Timeline profile={profile} ui={ui} />
      <Pillars profile={profile} ui={ui} />
      <Projects projects={content.projects} ui={ui} />
      <Books profile={profile} ui={ui} />
      <Section id="lectures" title={ui.sections.lectures}><p>lectures</p></Section>
      <Section id="contact" title={ui.sections.contact}><p>contact</p></Section>
    </>
  );
}
