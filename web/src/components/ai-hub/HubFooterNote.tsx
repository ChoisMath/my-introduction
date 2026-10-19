'use client';
import { usePathname } from 'next/navigation';
import { activeTabId } from '@/lib/ai-tabs';

// 모션·슬라이드는 원본을 학교용으로 다시 만든 2차 저작물이고, 브랜드 룩북은 원본을 그대로 옮긴 사본이라 문구가 다르다.
export function HubFooterNote() {
  const isCopied = activeTabId(usePathname()) === 'brand';
  return (
    <>
      © 이 페이지는 <a href="https://oppadu.com/ai" target="_blank" rel="noreferrer" className="underline hover:text-fg">oppadu.com/ai</a>
      {isCopied ? '에서 옮겨온 자료입니다.' : '를 가공한 2차 저작물입니다.'}
    </>
  );
}
