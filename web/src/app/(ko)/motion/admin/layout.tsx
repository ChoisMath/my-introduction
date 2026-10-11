import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin('/motion/admin/');
  return <div className="px-2 py-6 sm:px-3 md:px-4 lg:px-6"><div className="mx-auto w-full max-w-6xl">{children}</div></div>;
}
