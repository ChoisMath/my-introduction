import type { ReactNode } from 'react';
import { RootShell } from '@/components/RootShell';
import { buildMetadata } from '@/lib/metadata';

export const metadata = buildMetadata('ko');
export default function KoLayout({ children }: { children: ReactNode }) {
  return <RootShell locale="ko">{children}</RootShell>;
}
