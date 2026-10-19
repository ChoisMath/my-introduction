'use client';
import { useState } from 'react';
import { writeClipboard } from '@/components/ai-hub/clipboard';

// 스타일 프롬프트는 누구나 볼 수 있다(오빠두엑셀 허락). Volume 에 데이터가 없을 때만 안내 문구를 둔다.
export function SlidePrompt({ id, prompt }: { id: string; prompt: string | null }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const onCopy = async () => {
    if (!prompt) return;
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
        <p data-testid="slide-prompt-empty" className="rounded-lg bg-dark-surface p-3 text-xs text-dark-fg/70">프롬프트 데이터 준비 중</p>
      )}
      <button
        type="button"
        data-testid="copy-slide-prompt"
        disabled={!prompt}
        onClick={() => void onCopy()}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold whitespace-nowrap text-bg disabled:opacity-50"
      >
        {copiedId === id ? '복사됨' : '프롬프트 복사'}
      </button>
    </div>
  );
}
