import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { requireViewer } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '모션 관리자', robots: { index: false, follow: false } };

// 관리자 화면은 사이트 머리글 위를 덮는 전체 화면 앱(motion 폴더 index.html 과 같은 모양)이다.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireViewer('/motion/admin/');
  return children;
}
