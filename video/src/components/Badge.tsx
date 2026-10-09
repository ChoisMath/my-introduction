import { SANS, theme } from '../theme';

export function Badge({ text, dark = false }: { text: string; dark?: boolean }) {
  return (
    <span style={{ fontFamily: SANS, fontSize: 22, fontWeight: 700, color: dark ? theme.color.darkBg : theme.color.bg, background: dark ? theme.color.darkAccent : theme.color.accent, padding: '10px 22px', borderRadius: 999, whiteSpace: 'nowrap', maxWidth: 600, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>
      {text}
    </span>
  );
}
