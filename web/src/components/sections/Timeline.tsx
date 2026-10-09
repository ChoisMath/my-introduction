import Image from 'next/image';
import type { Profile, TimelineItem, Ui } from '@me/content';
import { Section } from '../Section';
import { Reveal } from '../motion/Reveal';

function Item({ item, index = 0 }: { item: TimelineItem; index?: number }) {
  return (
    <li className="relative pl-6">
      <span className={`absolute top-1.5 left-0 h-3 w-3 rounded-full ${item.highlight ? 'bg-accent' : 'border-2 border-accent bg-bg'}`} />
      <Reveal delay={index * 0.05}>
      <p className="font-mono text-xs text-muted">{item.period}</p>
      <p className="font-semibold">{item.title}</p>
      {item.org ? <p className="text-sm text-muted">{item.org}</p> : null}
      {item.detail ? <p className="text-sm text-muted">{item.detail}</p> : null}
      </Reveal>
    </li>
  );
}

export function Timeline({ profile, ui }: { profile: Profile; ui: Ui }) {
  return (
    <Section id="timeline" title={ui.sections.timeline}>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <ol className="relative space-y-6 border-l border-line pl-2">
          {profile.career.map((c, i) => <Item key={c.id} item={c} index={i} />)}
        </ol>
        <aside className="space-y-6">
          <Image src={profile.photo} alt={profile.name} width={240} height={300} className="w-40 rounded-2xl" />
          <div>
            <h3 className="mb-2 text-sm font-bold text-muted">{ui.sections.education}</h3>
            <ol className="space-y-3">{profile.education.map((e) => <Item key={e.id} item={e} />)}</ol>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold text-muted">{ui.sections.awards}</h3>
            <ol className="space-y-3">{profile.awards.map((a) => <Item key={a.id} item={a} />)}</ol>
          </div>
        </aside>
      </div>
    </Section>
  );
}
