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
      className="relative before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-line px-2 font-mono text-xs whitespace-nowrap"
    >
      {label}
    </a>
  );
}
