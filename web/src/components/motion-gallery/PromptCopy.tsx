'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { CONTACT_NOTE } from './contact';
import { GoogleSignInButton } from './GoogleSignInButton';

type Lang = 'en' | 'ko';
type Props =
  | { id: string; status: 'signedOut' | 'guest' | 'pending' | 'unavailable'; member?: unknown }
  | { id: string; status: 'allowed'; prompts: Record<Lang, string> | null };

const LABEL: Record<Lang, string> = { en: '프롬프트 복사 (영문)', ko: '프롬프트 복사 (국문)' };

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

export function PromptCopy(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState<Lang | null>(null);
  const prompts = props.status === 'allowed' ? props.prompts : null;
  const isUnavailable = props.status === 'allowed' && !prompts;

  const onCopy = async (lang: Lang) => {
    if (!prompts) {
      dialog.current?.showModal();
      return;
    }
    await writeClipboard(prompts[lang]);
    setCopied(lang);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {(['en', 'ko'] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          data-testid={`copy-prompt-${lang}`}
          disabled={isUnavailable}
          onClick={() => void onCopy(lang)}
          className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold whitespace-nowrap disabled:opacity-50 ${copied === lang ? 'bg-fg text-bg' : 'bg-accent text-bg'}`}
        >
          {copied === lang ? '복사됨' : LABEL[lang]}
        </button>
      ))}
      {props.status === 'allowed' ? (
        <Link href={`/motion/admin/${props.id}/`} prefetch={false} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent">
          빈칸 편집·장면표
        </Link>
      ) : null}
      {isUnavailable ? <span className="text-sm whitespace-nowrap text-muted">프롬프트 데이터 준비 중</span> : null}
      {props.status === 'allowed' ? null : (
        <dialog
          ref={dialog}
          data-testid="signin-dialog"
          aria-labelledby="signin-dialog-title"
          onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
          className="m-auto w-[min(92vw,420px)] rounded-2xl bg-bg p-0 text-fg backdrop:bg-black/60"
        >
          <div className="flex flex-col gap-3 p-3 sm:p-5">
            <h2 id="signin-dialog-title" className="text-lg font-bold">
              {props.status !== 'signedOut' ? '등록되지 않은 계정입니다.' : '로그인하여 프롬프트를 복사하세요.'}
            </h2>
            <p className="text-sm text-muted">{CONTACT_NOTE}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <GoogleSignInButton from={`/motion/${props.id}/`} label={props.status !== 'signedOut' ? '다른 Google 계정으로 로그인' : 'Google로 로그인'} />
              <button type="button" onClick={() => dialog.current?.close()} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm whitespace-nowrap">닫기</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
