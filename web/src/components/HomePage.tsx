import { getContent, type Locale } from '@me/content';
import { Section } from './Section';

export function HomePage({ locale }: { locale: Locale }) {
  const { ui } = getContent(locale);
  return (
    <>
      <Section id="hero"><p>hero</p></Section>
      <Section id="stats" title={ui.sections.stats}><p>stats</p></Section>
      <Section id="timeline" title={ui.sections.timeline}><p>timeline</p></Section>
      <Section id="pillars" title={ui.sections.pillars}><p>pillars</p></Section>
      <Section id="projects" title={ui.sections.projects} dark><p>projects</p></Section>
      <Section id="books" title={ui.sections.books}><p>books</p></Section>
      <Section id="lectures" title={ui.sections.lectures}><p>lectures</p></Section>
      <Section id="contact" title={ui.sections.contact}><p>contact</p></Section>
    </>
  );
}
