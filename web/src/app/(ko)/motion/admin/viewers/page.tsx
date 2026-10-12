import Link from 'next/link';
import { ViewerForm } from '@/components/motion-gallery/admin/ViewerForm';
import s from '@/components/motion-gallery/admin/admin.module.css';
import { requireAdmin } from '@/lib/admin-session';
import { listViewers, type Viewer } from '@/lib/motion-viewers';
import { removeViewerAction } from './actions';

export const dynamic = 'force-dynamic';

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' });

export default async function ViewersPage() {
  await requireAdmin('/motion/admin/viewers/');
  let viewers: Viewer[] | null = null;
  try {
    viewers = await listViewers();
  } catch (error) {
    console.error('[motion-viewers] list failed', error);
  }

  return (
    <div className={s.app}>
      <header className={s.dTop}>
        <Link href="/motion/admin/" prefetch={false} className={s.ib} aria-label="목록으로">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <div className={s.crumb}><b>열람자 관리</b> · 등록한 Google 계정은 프롬프트·장면표·소리 큐를 볼 수 있습니다</div>
        <span className={s.pos}>{viewers ? `${viewers.length}명` : ''}</span>
      </header>
      <main className={s.vMain}>
        <section className={s.box}>
          <div className={s.boxH}><h3>열람자 추가</h3><span className={s.hint}>Google 계정 이메일 · 삭제하면 바로 볼 수 없습니다</span></div>
          <ViewerForm />
        </section>
        {viewers === null ? (
          <p role="alert" className={s.alert}>열람자 목록을 불러오지 못했습니다. <code>DATABASE_URL</code> 과 DB 상태를 확인하세요.</p>
        ) : viewers.length === 0 ? (
          <div className={s.empty}>등록된 열람자가 없습니다</div>
        ) : (
          <section className={`${s.box} ${s.vTable}`}>
            <table className={s.table}>
              <thead>
                <tr><th className={s.t}>이메일</th><th>메모</th><th>등록자</th><th>등록일</th><th><span className="sr-only">삭제</span></th></tr>
              </thead>
              <tbody>
                {viewers.map((v) => (
                  <tr key={v.id} data-testid="viewer-row">
                    <td className={s.t} title={v.email}><span className={s.cut}>{v.email}</span></td>
                    <td>{v.note ?? ''}</td>
                    <td>{v.addedBy}</td>
                    <td>{dateFormat.format(v.createdAt)}</td>
                    <td>
                      <form action={removeViewerAction}>
                        <input type="hidden" name="id" value={v.id} />
                        <button type="submit" className={s.del} aria-label={`${v.email} 삭제`}>삭제</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}
