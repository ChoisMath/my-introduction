import type { ReactNode } from 'react';
import { getContent, type Locale } from '@me/content';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource-variable/jetbrains-mono';
import '@/app/globals.css';
import { Nav } from './Nav';

export function RootShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const { ui } = getContent(locale);
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        <Nav locale={locale} ui={ui} />
        <main className="pt-[var(--nav-h)]">{children}</main>
        <footer className="px-2 py-8 text-center text-xs text-muted sm:px-3">{ui.footer}</footer>
      </body>
    </html>
  );
}
