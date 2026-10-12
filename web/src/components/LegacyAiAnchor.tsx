'use client';

import { useEffect } from 'react';
import { AI_HOME } from '@/lib/ai-paths';

// 홈에 AI활용 섹션이 있던 때 공유된 /#ai, /#motion 링크를 허브로 보낸다. 해시는 서버에 오지 않아 redirects() 로는 못 잡는다.
export function LegacyAiAnchor() {
  useEffect(() => {
    if (location.hash === '#ai' || location.hash === '#motion') location.replace(AI_HOME);
  }, []);
  return null;
}
