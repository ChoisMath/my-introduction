import Image from 'next/image';
import type { Profile, Ui } from '@me/content';
import { Section } from '../Section';
import { Reveal } from '../motion/Reveal';

export function Books({ profile, ui }: { profile: Profile; ui: Ui }) {
  return (
    <Section id="books" title={ui.sections.books}>
      {/* 3권뿐이라 넓은 화면에서는 6칸 그리드에 3칸만 써서 표지가 과하게 커지지 않게 한다. */}
      <ul className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {profile.books.map((b, i) => (
          <li key={b.id}>
            <Reveal delay={i * 0.05}>
            <a href={b.url} target="_blank" rel="noreferrer" className="block">
              <Image src={b.cover} alt={b.title} width={600} height={880} className="w-full rounded-lg border border-line shadow-sm" />
              <p className="mt-3 font-semibold">{b.title}</p>
              <p className="text-sm text-muted">{b.role} · {b.year}{b.publisher ? ` · ${b.publisher}` : ''}</p>
              <p className="font-mono text-xs text-muted">ISBN {b.isbn}</p>
            </a>
            </Reveal>
          </li>
        ))}
      </ul>
    </Section>
  );
}
