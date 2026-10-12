'use client';
import Link from 'next/link';
import { useState } from 'react';
import { SignInDialog, type DialogState } from '@/components/ai-hub/SignInDialog';
import { writeClipboard } from '@/components/ai-hub/clipboard';
import type { MemberSummary } from '@/lib/access';
import { aiMotionAdminPath, aiMotionPath } from '@/lib/ai-paths';

type Lang = 'en' | 'ko';
type Props =
  | { id: string; status: DialogState; member: MemberSummary | null }
  | { id: string; status: 'allowed'; prompts: Record<Lang, string> | null };

const LABEL: Record<Lang, string> = { en: '프롬프트 복사 (영문)', ko: '프롬프트 복사 (국문)' };

export function PromptCopy(props: Props) {
  const [isOpen, setOpen] = useState(false);
  const [copied, setCopied] = useState<Lang | null>(null);
  const prompts = props.status === 'allowed' ? props.prompts : null;
  const isUnavailable = props.status === 'allowed' && !prompts;

  const onCopy = async (lang: Lang) => {
    if (!prompts) {
      setOpen(true);
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
        <Link href={aiMotionAdminPath(props.id)} prefetch={false} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent">
          빈칸 편집·장면표
        </Link>
      ) : null}
      {isUnavailable ? <span className="text-sm whitespace-nowrap text-muted">프롬프트 데이터 준비 중</span> : null}
      {props.status === 'allowed' ? null : (
        <SignInDialog open={isOpen} onClose={() => setOpen(false)} state={props.status} from={aiMotionPath(props.id)} member={props.member} />
      )}
    </div>
  );
}
