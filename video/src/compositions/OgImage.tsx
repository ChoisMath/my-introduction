// 1200×630 공유 이미지
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { getContent, type Locale } from '@me/content';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

export function OgImage({ locale }: { locale: Locale }) {
  const { profile } = getContent(locale);
  return (
    <AbsoluteFill style={{ background: theme.color.bg, backgroundImage: `linear-gradient(${theme.color.grid} 1px, transparent 1px), linear-gradient(90deg, ${theme.color.grid} 1px, transparent 1px)`, backgroundSize: '40px 40px', flexDirection: 'row', alignItems: 'center', padding: 72, fontFamily: SANS }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: MONO, fontSize: 24, color: theme.color.accent }}>{profile.affiliation} · {profile.role}</div>
        <div style={{ fontSize: 96, fontWeight: 800, color: theme.color.fg, marginTop: 8 }}>{profile.name}</div>
        <div style={{ fontSize: 30, lineHeight: 1.35, color: theme.color.muted, marginTop: 8, wordBreak: 'keep-all' }}>{profile.tagline}</div>
        <div style={{ fontFamily: MONO, fontSize: 28, color: theme.color.accent, marginTop: 40 }}>me.chois.pro</div>
      </div>
      <Img src={staticFile(profile.pictogram.replace(/^\//, ''))} style={{ width: 400, height: 400, borderRadius: 32 }} />
    </AbsoluteFill>
  );
}
