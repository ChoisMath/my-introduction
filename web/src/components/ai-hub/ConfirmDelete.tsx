'use client';
import { useRef } from 'react';
import { deleteAction } from '@/app/(ko)/ai/(app)/admin/members/actions';
import s from '@/components/motion-gallery/admin/admin.module.css';

export function ConfirmDelete({ id, label }: { id: number; label: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={s.del} onClick={() => dialog.current?.showModal()}>삭제</button>
      <dialog ref={dialog} data-testid="confirm-delete" className={s.confirm} onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
        <p>{label} 신청을 삭제할까요? 되돌릴 수 없습니다.</p>
        <form action={deleteAction} data-action="delete" className={s.confirmRow}>
          <input type="hidden" name="id" value={id} />
          <button type="button" className={s.del} onClick={() => dialog.current?.close()}>취소</button>
          <button type="submit" className={s.vSubmit}>삭제</button>
        </form>
      </dialog>
    </>
  );
}
