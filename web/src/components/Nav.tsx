import type { Locale, Ui } from '@me/content';
import { SECTION_IDS } from '@/lib/sections';
import { LangToggle } from './LangToggle';

export function Nav({ locale, ui }: { locale: Locale; ui: Ui }) {
  return (
    <header className="fixed inset-x-0 top-0 z-10 h-[var(--nav-h)] border-b border-line bg-bg/90 backdrop-blur">
      <nav className="mx-auto flex h-full max-w-6xl items-center gap-2 px-2 sm:px-3" aria-label="primary">
        <a href="#hero" className="min-h-11 inline-flex items-center font-mono text-sm font-bold whitespace-nowrap">chois</a>
        <ul className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap">
          {SECTION_IDS.filter((id) => id !== 'hero').map((id) => (
            <li key={id}>
              <a href={`#${id}`} className="min-h-11 inline-flex items-center rounded-full px-3 text-sm text-muted hover:text-fg">
                {ui.nav[id]}
              </a>
            </li>
          ))}
        </ul>
        <LangToggle locale={locale} label={ui.lang.switchTo} title={ui.lang.switchLabel} />
      </nav>
    </header>
  );
}
