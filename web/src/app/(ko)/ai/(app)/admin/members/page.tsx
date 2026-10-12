import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountMenu } from '@/components/ai-hub/AccountMenu';
import { ConfirmDelete } from '@/components/ai-hub/ConfirmDelete';
import { MemberAddForm } from '@/components/ai-hub/MemberAddForm';
import s from '@/components/motion-gallery/admin/admin.module.css';
import { getViewerState, requireAdmin } from '@/lib/access';
import { AI_MEMBERS, AI_MOTION_ADMIN } from '@/lib/ai-paths';
import { errorTag } from '@/lib/log';
import { listMembers, type MemberRow } from '@/lib/members';
import { approveAction, suspendAction, updateProfileAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '회원 관리', robots: { index: false, follow: false } };

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' });
type Filter = 'pending' | 'approved' | 'all';
const FILTERS: [Filter, string][] = [['pending', '대기'], ['approved', '등록'], ['all', '전체']];

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin(AI_MEMBERS);
  const account = await getViewerState();
  let members: MemberRow[] | null = null;
  try {
    members = await listMembers();
  } catch (error) {
    console.error('[members] list failed', errorTag(error));
  }
  const pending = members?.filter((m) => m.status === 'PENDING') ?? [];
  const approved = members?.filter((m) => m.status === 'APPROVED') ?? [];
  const params = await searchParams;
  const raw = params.s;
  const error = params.error;
  const asked = (Array.isArray(raw) ? raw[0] : raw) as Filter | undefined;
  const filter: Filter = asked && FILTERS.some(([f]) => f === asked) ? asked : pending.length > 0 ? 'pending' : 'approved';
  const rows = filter === 'pending' ? pending : filter === 'approved' ? approved : (members ?? []);
  const count = { pending: pending.length, approved: approved.length, all: members?.length ?? 0 };

  return (
    <div className={s.app}>
      <header className={s.dTop}>
        <Link href={AI_MOTION_ADMIN} prefetch={false} className={s.ib} aria-label="프롬프트 목록으로">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <div className={s.crumb}><b>회원 관리</b> · 승인된 교사는 AI활용의 모든 프롬프트를 쓸 수 있습니다</div>
        {account.status === 'signedOut' ? null : <AccountMenu state={account} tone="dark" />}
      </header>
      <main className={s.vMain}>
        <section className={s.box}>
          <div className={s.boxH}><h3>직접 추가</h3><span className={s.hint}>바로 등록 상태가 됩니다</span></div>
          <MemberAddForm />
        </section>
        <nav className={s.sTabs} aria-label="상태">
          {FILTERS.map(([f, label]) => (
            <Link key={f} href={`${AI_MEMBERS}?s=${f}`} prefetch={false} className={f === filter ? s.isOn : ''} aria-current={f === filter ? 'page' : undefined}>
              {label} <b>{count[f]}</b>
            </Link>
          ))}
        </nav>
        {error === 'db' ? <p role="alert" className={s.alert}>DB 오류로 처리하지 못했습니다. 잠시 후 다시 시도하세요.</p> : null}
        {error === 'input' ? <p role="alert" className={s.alert}>이름·소속을 확인하세요 (이름 1–30자, 소속 1–50자).</p> : null}
        {members === null ? (
          <p role="alert" className={s.alert}>회원 목록을 불러오지 못했습니다. <code>DATABASE_URL</code> 과 DB 상태를 확인하세요.</p>
        ) : rows.length === 0 ? (
          <div className={s.empty}>해당하는 회원이 없습니다</div>
        ) : (
          <section className={`${s.box} ${s.vTable}`}>
            <table className={s.table}>
              <thead>
                <tr><th className={s.t}>이름</th><th>소속</th><th>이메일</th><th>상태</th><th>신청일</th><th>처리</th><th><span className="sr-only">동작</span></th></tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} data-testid="member-row" data-status={m.status} data-id={m.id}>
                    <td className={s.t}>
                      <details className={s.edit}>
                        <summary>{m.name}<span className="sr-only"> 수정</span></summary>
                        <form action={updateProfileAction}>
                          <input type="hidden" name="id" value={m.id} />
                          <input name="name" aria-label="이름" required maxLength={30} defaultValue={m.name} />
                          <input name="affiliation" aria-label="소속" required maxLength={50} defaultValue={m.affiliation} />
                          <button type="submit" className={s.vSubmit}>저장</button>
                        </form>
                      </details>
                    </td>
                    <td>{m.affiliation}</td>
                    <td title={m.email}><span className={s.cut}>{m.email}</span></td>
                    <td><span className={`${s.stat} ${m.status === 'PENDING' ? s.isPending : ''}`}>{m.status === 'PENDING' ? '대기' : '등록'}</span></td>
                    <td>{dateFormat.format(m.createdAt)}</td>
                    <td>{m.decidedBy && m.decidedAt ? `${m.decidedBy.split('@')[0]} · ${dateFormat.format(m.decidedAt)}` : ''}</td>
                    <td>
                      <div className={s.rowActs}>
                        {m.status === 'PENDING' ? (
                          <>
                            <form action={approveAction}><input type="hidden" name="id" value={m.id} /><button type="submit" className={s.ok}>승인</button></form>
                            <ConfirmDelete id={m.id} label={m.name} />
                          </>
                        ) : (
                          <form action={suspendAction}><input type="hidden" name="id" value={m.id} /><button type="submit" className={s.del}>대기로 변경</button></form>
                        )}
                      </div>
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
