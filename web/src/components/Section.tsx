import type { ReactNode } from 'react';
import type { SectionId } from '@/lib/sections';

export function Section({ id, title, dark = false, children }: { id: SectionId; title?: string; dark?: boolean; children: ReactNode }) {
  return (
    <section
      id={id}
      className={`scroll-mt-[var(--nav-h)] px-2 py-10 sm:px-3 md:px-4 lg:px-6 lg:py-16 ${dark ? 'bg-dark-bg text-dark-fg' : ''}`}
    >
      <div className="mx-auto w-full max-w-6xl">
        {title ? <h2 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2> : null}
        {children}
      </div>
    </section>
  );
}
