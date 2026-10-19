import type { Locale, Ui } from '@me/content';
import { AI_HOME } from '@/lib/ai-paths';
import { localePath } from '@/lib/locale';
import { SECTION_IDS } from '@/lib/sections';
import type { ViewerState } from '@/lib/access';
import { AccountMenu } from './ai-hub/AccountMenu';
import { SignInButton } from './ai-hub/SignInButton';
import { LangToggle } from './LangToggle';

export function Nav({ locale, ui, account }: { locale: Locale; ui: Ui; account: ViewerState }) {
  const home = localePath(locale);
  const ids = SECTION_IDS.filter((id) => id !== 'hero');
  return (
    <header className="fixed inset-x-0 top-0 z-10 h-[var(--nav-h)] border-b border-line bg-bg/90 backdrop-blur">
      <nav className="mx-auto flex h-full max-w-site items-center gap-2 gutter" aria-label="primary">
        <a href={`${home}#hero`} className="min-h-11 min-w-11 inline-flex items-center gap-1.5 px-1 font-mono text-sm font-bold whitespace-nowrap">
          {/* eslint-disable-next-line @next/next/no-img-element -- 24px 정적 로고라 최적화 이득이 없다 */}
          <img src="/img/logo.webp" alt="" width={24} height={24} className="size-6 rounded-full" />
          Chois
        </a>
        <ul className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap">
          {ids.map((id) => (
            <li key={id}>
              <a href={`${home}#${id}`} className="min-h-11 inline-flex items-center rounded-full px-3 text-sm text-muted hover:text-fg">
                {ui.nav[id]}
              </a>
            </li>
          ))}
          <li>
            <a href={AI_HOME} data-testid="nav-ai" className="min-h-11 inline-flex items-center rounded-full px-3 text-sm text-muted hover:text-fg">
              {ui.nav.ai}
            </a>
          </li>
        </ul>
        <LangToggle locale={locale} label={ui.lang.switchTo} title={ui.lang.switchLabel} />
        {account.status === 'signedOut' ? <SignInButton label={ui.ai.signIn} /> : <AccountMenu state={account} />}
      </nav>
    </header>
  );
}
