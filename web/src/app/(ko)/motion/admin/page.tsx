import Link from 'next/link';
import { getMotionList } from '@me/content';
import { loadMotionAdmin } from '@/lib/admin-session';
import { getRenderedMotions } from '@/lib/media';

export const dynamic = 'force-dynamic';

export default async function AdminListPage() {
  const admin = await loadMotionAdmin('/motion/admin/');
  const rendered = new Set((await getRenderedMotions()).map((m) => m.id));
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">모션 관리자</h1>
      {admin ? null : <p role="alert" className="mb-4 rounded-md border border-line p-3 text-sm">관리자 데이터가 없습니다. 로컬에서 <code>npm run motion:import && npm run media:push</code> 를 실행하세요.</p>}
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {getMotionList().map((m) => (
          <li key={m.id}>
            <Link href={`/motion/admin/${m.id}/`} prefetch={false} data-testid="admin-row" className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 hover:border-accent">
              <span className="font-mono text-xs text-muted">{String(m.no).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1 overflow-hidden text-sm text-ellipsis whitespace-nowrap" title={m.name}>{m.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${rendered.has(m.id) ? 'bg-fg text-bg' : 'border border-line text-muted'}`}>
                {rendered.has(m.id) ? '렌더됨' : '대기'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
