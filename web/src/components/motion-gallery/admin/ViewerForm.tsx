'use client';
import { useActionState } from 'react';
import { addViewerAction, type ViewerFormState } from '@/app/(ko)/motion/admin/viewers/actions';
import s from './admin.module.css';

export function ViewerForm() {
  const [state, action, isPending] = useActionState<ViewerFormState, FormData>(addViewerAction, null);
  return (
    <form action={action}>
      <div className={s.vForm}>
        <div className={s.f}>
          <label htmlFor="viewer-email">이메일</label>
          <input id="viewer-email" name="email" type="email" required autoComplete="off" placeholder="student@gmail.com" defaultValue={state?.email} />
        </div>
        <div className={s.f}>
          <label htmlFor="viewer-note">메모 (선택)</label>
          <input id="viewer-note" name="note" maxLength={100} autoComplete="off" placeholder="이름·소속" defaultValue={state?.note} />
        </div>
        <button type="submit" className={s.vSubmit} disabled={isPending}>{isPending ? '등록 중…' : '추가'}</button>
      </div>
      {state ? <p role="status" title={state.message} className={`${s.vMsg} ${state.ok ? '' : s.isError}`}>{state.message}</p> : null}
    </form>
  );
}
