import { computeStats, getContent, type Locale } from '@me/content';
import { Section } from './Section';
import { Hero } from './sections/Hero';
import { Stats } from './sections/Stats';
import { Timeline } from './sections/Timeline';

export function HomePage({ locale }: { locale: Locale }) {
  const content = getContent(locale);
  const { profile, ui } = content;
  const stats = computeStats(content);
  return (
    <>
      <Hero profile={profile} ui={ui} />
      <Stats stats={stats} ui={ui} />
      <Timeline profile={profile} ui={ui} />
      <Section id="pillars" title={ui.sections.pillars}><p>pillars</p></Section>
      <Section id="projects" title={ui.sections.projects} dark><p>projects</p></Section>
      <Section id="books" title={ui.sections.books}><p>books</p></Section>
      <Section id="lectures" title={ui.sections.lectures}><p>lectures</p></Section>
      <Section id="contact" title={ui.sections.contact}><p>contact</p></Section>
    </>
  );
}
