// 히어로 루프 경계를 흰 베일로 잇는다: 0~0.5s fade-in, 마지막 0.7s fade-out. 반환값은 베일 불투명도.
export function loopVeil(frame: number, totalFrames: number, fps: number): number {
  const inFrames = 0.5 * fps;
  const outFrames = 0.7 * fps;
  if (frame < inFrames) return 1 - frame / inFrames;
  const fromEnd = totalFrames - frame;
  if (fromEnd <= outFrames) return 1 - fromEnd / outFrames;
  return 0;
}
