import { computeStats, getContent, type Locale } from '@me/content';
import { Hero } from './sections/Hero';
import { Stats } from './sections/Stats';
import { Timeline } from './sections/Timeline';
import { Pillars } from './sections/Pillars';
import { Projects } from './sections/Projects';
import { Books } from './sections/Books';
import { Lectures } from './sections/Lectures';
import { Contact } from './sections/Contact';

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
      <Lectures profile={profile} ui={ui} />
      <Contact profile={profile} ui={ui} />
    </>
  );
}
