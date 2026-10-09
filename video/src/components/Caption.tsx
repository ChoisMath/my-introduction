// 하단 자막
import { AbsoluteFill } from 'remotion';
import { SANS, theme } from '../theme';

export function Caption({ text, dark = false }: { text: string; dark?: boolean }) {
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 72 }}>
      <div style={{ fontFamily: SANS, fontSize: 40, fontWeight: 600, color: dark ? theme.color.darkFg : theme.color.fg, background: dark ? 'rgba(11,18,32,0.7)' : 'rgba(255,255,255,0.85)', padding: '12px 28px', borderRadius: 16, whiteSpace: 'nowrap' }}>
        {text}
      </div>
    </AbsoluteFill>
  );
}
