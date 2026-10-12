import type { ReactNode } from 'react';
import { getContent, type Locale } from '@me/content';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource-variable/jetbrains-mono';
import '@/app/globals.css';
import { getRenderedMotions } from '@/lib/media';
import { getViewerState } from '@/lib/access';
import { Nav } from './Nav';

export async function RootShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const { ui } = getContent(locale);
  const hasMotion = (await getRenderedMotions()).length > 0;
  const account = await getViewerState();
  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        <Nav locale={locale} ui={ui} hasMotion={hasMotion} account={account} />
        <main className="pt-[var(--nav-h)]">{children}</main>
        <footer className="px-2 py-8 text-center text-xs text-muted sm:px-3">{ui.footer}</footer>
      </body>
    </html>
  );
}
