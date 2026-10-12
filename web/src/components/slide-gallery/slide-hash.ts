import { useSyncExternalStore } from 'react';

const EVENT = 'slide-hash-change';

export function readHashId(hash: string): string {
  try {
    return decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    return '';
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

// 해시가 상세 창의 유일한 진실 공급원이다. 서버 렌더에는 해시가 없으므로 항상 닫힌 상태로 그린다.
export function useHashId(): string {
  return useSyncExternalStore(subscribe, () => readHashId(window.location.hash), () => '');
}

// 상세 창 안에서 스타일을 넘길 때 뒤로 가기 기록이 쌓이지 않게 replaceState 를 쓴다. replaceState 는 hashchange 를 내지 않아 직접 알린다.
export function setHashId(id: string | null) {
  history.replaceState(null, '', id ? `#${encodeURIComponent(id)}` : `${location.pathname}${location.search}`);
  window.dispatchEvent(new Event(EVENT));
}
