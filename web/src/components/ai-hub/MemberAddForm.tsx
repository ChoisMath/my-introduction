'use client';
import { useActionState } from 'react';
import { addMemberAction, type MemberFormState } from '@/app/(ko)/ai/(app)/admin/members/actions';
import s from '@/components/motion-gallery/admin/admin.module.css';

export function MemberAddForm() {
  const [state, action, isPending] = useActionState<MemberFormState, FormData>(addMemberAction, null);
  return (
    <form action={action} data-testid="member-add">
      <div className={s.vForm}>
        <div className={s.f}><label htmlFor="member-email">이메일</label><input id="member-email" name="email" type="email" required autoComplete="off" placeholder="teacher@gmail.com" defaultValue={state?.email} /></div>
        <div className={s.f}><label htmlFor="member-name">이름</label><input id="member-name" name="name" required maxLength={30} autoComplete="off" defaultValue={state?.name} /></div>
        <div className={s.f}><label htmlFor="member-affiliation">소속</label><input id="member-affiliation" name="affiliation" required maxLength={50} autoComplete="off" defaultValue={state?.affiliation} /></div>
        <button type="submit" className={s.vSubmit} disabled={isPending}>{isPending ? '등록 중…' : '추가'}</button>
      </div>
      {state ? <p role="status" title={state.message} className={`${s.vMsg} ${state.ok ? '' : s.isError}`}>{state.message}</p> : null}
    </form>
  );
}
