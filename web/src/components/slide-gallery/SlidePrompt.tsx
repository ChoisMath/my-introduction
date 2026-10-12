'use client';
import { useState } from 'react';
import { SignInDialog } from '@/components/ai-hub/SignInDialog';
import { writeClipboard } from '@/components/ai-hub/clipboard';
import type { SlidePromptAccess } from '@/lib/access';
import { AI_SLIDE } from '@/lib/ai-paths';

export function SlidePrompt({ id, access }: { id: string; access: SlidePromptAccess }) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const prompt = access.status === 'allowed' ? access.prompts?.[id] ?? null : null;
  const isUnavailable = access.status === 'allowed' && !prompt;

  const onCopy = async () => {
    if (!prompt) {
      setDialogOpen(true);
      return;
    }
    await writeClipboard(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col gap-2 lg:mt-auto">
      <p className="text-sm font-semibold whitespace-nowrap">스타일 프롬프트</p>
      {prompt ? (
        <p data-testid="slide-prompt" lang="en" className="max-h-48 overflow-y-auto rounded-lg bg-dark-surface p-3 font-mono text-xs leading-relaxed">{prompt}</p>
      ) : (
        <p data-testid="slide-prompt-locked" className="rounded-lg bg-dark-surface p-3 text-xs text-dark-fg/70">
          {isUnavailable ? '프롬프트 데이터 준비 중' : '승인된 교사 회원에게 공개됩니다.'}
        </p>
      )}
      <button
        type="button"
        data-testid="copy-slide-prompt"
        disabled={isUnavailable}
        onClick={() => void onCopy()}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold whitespace-nowrap text-bg disabled:opacity-50"
      >
        {copiedId === id ? '복사됨' : '프롬프트 복사'}
      </button>
      {access.status === 'allowed' ? null : (
        <SignInDialog open={isDialogOpen} onClose={() => setDialogOpen(false)} state={access.status} from={AI_SLIDE} member={access.member} />
      )}
    </div>
  );
}
