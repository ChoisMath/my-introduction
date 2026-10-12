'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { applyAction, type JoinFormState } from '@/app/(ko)/ai/(hub)/join/actions';

const field = 'min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-base';

export function JoinForm({ defaults, isPending, from }: { defaults: { name: string; affiliation: string }; isPending: boolean; from: string }) {
  const [state, action, isSubmitting] = useActionState<JoinFormState, FormData>(applyAction, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="whitespace-nowrap text-muted">이름</span>
        <input name="name" required maxLength={30} autoComplete="name" defaultValue={state?.name ?? defaults.name} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="whitespace-nowrap text-muted">소속</span>
        <input name="affiliation" required maxLength={50} placeholder="예: ○○고등학교" defaultValue={state?.affiliation ?? defaults.affiliation} className={field} />
      </label>
      <button type="submit" disabled={isSubmitting} className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold whitespace-nowrap text-bg disabled:opacity-50">
        {isSubmitting ? '보내는 중…' : isPending ? '신청 내용 저장' : '신청하기'}
      </button>
      {state ? <p role="status" className={`text-sm ${state.ok ? 'text-fg' : 'text-accent'}`}>{state.message}</p> : null}
      {state?.ok ? (
        <Link href={from} prefetch={false} className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold whitespace-nowrap">돌아가기</Link>
      ) : null}
    </form>
  );
}
