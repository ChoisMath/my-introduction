import type { ReactNode } from 'react';
import { getContent, type Locale } from '@me/content';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource-variable/jetbrains-mono';
import '@/app/globals.css';
import { getViewerState } from '@/lib/access';
import { Nav } from './Nav';

export async function RootShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const { ui } = getContent(locale);
  const account = await getViewerState();
  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        <Nav locale={locale} ui={ui} account={account} />
        <main className="pt-[var(--nav-h)]">{children}</main>
      </body>
    </html>
  );
}
