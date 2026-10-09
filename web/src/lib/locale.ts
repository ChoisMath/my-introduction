import type { Locale } from '@me/content';

export function localePath(locale: Locale): '/' | '/en/' {
  return locale === 'ko' ? '/' : '/en/';
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'ko' ? 'en' : 'ko';
}

export function toggleHref(locale: Locale, hash: string): string {
  const safeHash = hash.startsWith('#') && hash.length > 1 ? hash : '';
  return localePath(otherLocale(locale)) + safeHash;
}
