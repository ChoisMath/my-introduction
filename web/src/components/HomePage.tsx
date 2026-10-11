import { computeStats, getContent, type Locale } from '@me/content';
import { getRenderedMotions, pickFeatured } from '@/lib/media';
import { Hero } from './sections/Hero';
import { Stats } from './sections/Stats';
import { Timeline } from './sections/Timeline';
import { Pillars } from './sections/Pillars';
import { Projects } from './sections/Projects';
import { Motion } from './sections/Motion';
import { Books } from './sections/Books';
import { Lectures } from './sections/Lectures';
import { Contact } from './sections/Contact';

export async function HomePage({ locale }: { locale: Locale }) {
  const content = getContent(locale);
  const { profile, ui } = content;
  const stats = computeStats(content);
  const motions = pickFeatured(await getRenderedMotions());
  return (
    <>
      <Hero profile={profile} ui={ui} locale={locale} />
      <Stats stats={stats} ui={ui} />
      <Timeline profile={profile} ui={ui} />
      <Pillars profile={profile} ui={ui} />
      <Projects projects={content.projects} ui={ui} />
      {motions.length > 0 ? <Motion items={motions} ui={ui} locale={locale} /> : null}
      <Books profile={profile} ui={ui} />
      <Lectures profile={profile} ui={ui} />
      <Contact profile={profile} ui={ui} />
    </>
  );
}
