'use client';
import { useEffect, useState } from 'react';
import type { Locale } from '@me/content';
import { toggleHref } from '@/lib/locale';

export function LangToggle({ locale, label, title }: { locale: Locale; label: string; title: string }) {
  const [href, setHref] = useState(() => toggleHref(locale, ''));
  useEffect(() => {
    const update = () => setHref(toggleHref(locale, window.location.hash));
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, [locale]);
  return (
    <a
      href={href}
      aria-label={title}
      data-testid="lang-toggle"
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line px-3 font-mono text-xs whitespace-nowrap"
    >
      {label}
    </a>
  );
}
