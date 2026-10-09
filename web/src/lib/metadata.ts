import type { Metadata } from 'next';
import { getContent, type Locale } from '@me/content';
import { localePath } from './locale';

export const SITE_URL = 'https://me.chois.pro';

export function buildMetadata(locale: Locale): Metadata {
  const { ui } = getContent(locale);
  const path = localePath(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: ui.siteTitle,
    description: ui.siteDescription,
    alternates: { canonical: path, languages: { ko: '/', en: '/en/' } },
    openGraph: {
      type: 'website',
      locale: locale === 'ko' ? 'ko_KR' : 'en_US',
      url: path,
      title: ui.siteTitle,
      description: ui.siteDescription,
      images: [{ url: '/img/og.png', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: ui.siteTitle, description: ui.siteDescription },
  };
}
