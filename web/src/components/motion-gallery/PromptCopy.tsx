'use client';
import Link from 'next/link';
import { useState } from 'react';
import { writeClipboard } from '@/components/ai-hub/clipboard';
import { aiMotionAdminPath } from '@/lib/ai-paths';

type Lang = 'en' | 'ko';
type Props = { id: string; prompts: Record<Lang, string> | null; canEdit: boolean };

const LABEL: Record<Lang, string> = { en: '프롬프트 복사 (영문)', ko: '프롬프트 복사 (국문)' };

// 프롬프트는 누구나 복사할 수 있다(오빠두엑셀 허락). 빈칸 편집기(/ai/motion/admin/)는 회원 기능이라 링크만 회원에게 보인다.
export function PromptCopy({ id, prompts, canEdit }: Props) {
  const [copied, setCopied] = useState<Lang | null>(null);
  const isUnavailable = !prompts;

  const onCopy = async (lang: Lang) => {
    if (!prompts) return;
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
      {canEdit ? (
        <Link href={aiMotionAdminPath(id)} prefetch={false} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent">
          빈칸 편집·장면표
        </Link>
      ) : null}
      {isUnavailable ? <span className="text-sm whitespace-nowrap text-muted">프롬프트 데이터 준비 중</span> : null}
    </div>
  );
}
