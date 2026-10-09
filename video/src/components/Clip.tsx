// 내레이션 클립. plan.clip(key) 가 null 이면 아무것도 렌더하지 않는다.
import { Audio, Sequence, staticFile } from 'remotion';
import type { Plan } from '../plan';

export function Clip({ plan, id, from = 0 }: { plan: Plan; id: string; from?: number }) {
  const src = plan.clip(id);
  if (!src) return null;
  return (
    <Sequence from={from} name={`clip:${id}`}>
      <Audio src={staticFile(src)} />
    </Sequence>
  );
}
