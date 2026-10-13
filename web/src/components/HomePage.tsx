import { computeStats, getContent, type Locale } from '@me/content';
import { getViewerState } from '@/lib/access';
import { Hero } from './sections/Hero';
import { Stats } from './sections/Stats';
import { Timeline } from './sections/Timeline';
import { Pillars } from './sections/Pillars';
import { Projects } from './sections/Projects';
import { Books } from './sections/Books';
import { Lectures } from './sections/Lectures';
import { Contact } from './sections/Contact';
import { LegacyAiAnchor } from './LegacyAiAnchor';
import { SiteFooter } from './SiteFooter';

export async function HomePage({ locale }: { locale: Locale }) {
  const content = getContent(locale);
  const { profile, ui } = content;
  const stats = computeStats(content);
  const isSignedIn = (await getViewerState()).status !== 'signedOut';
  return (
    <>
      <Hero profile={profile} ui={ui} locale={locale} />
      <Stats stats={stats} ui={ui} />
      <Timeline profile={profile} ui={ui} />
      <Pillars profile={profile} ui={ui} />
      <Projects projects={content.projects} ui={ui} />
      <Books profile={profile} ui={ui} />
      <Lectures profile={profile} ui={ui} />
      <Contact profile={profile} ui={ui} locale={locale} isSignedIn={isSignedIn} />
      <LegacyAiAnchor />
      <SiteFooter>{ui.footer}</SiteFooter>
    </>
  );
}
