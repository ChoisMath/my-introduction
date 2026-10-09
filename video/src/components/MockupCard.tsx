import { Img, staticFile } from 'remotion';
import type { Project } from '@me/content';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

export function MockupCard({ project, width }: { project: Project; width: number }) {
  return (
    <div style={{ width, background: theme.color.darkSurface, borderRadius: 24, overflow: 'hidden', fontFamily: SANS, boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
      <Img src={staticFile(project.mockup.replace(/^\//, ''))} style={{ width, height: width * 0.625, objectFit: 'cover', display: 'block' }} />
      <div style={{ padding: 28 }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: theme.color.darkFg }}>{project.name}</div>
        <div style={{ fontSize: 26, color: theme.color.darkMuted, marginTop: 6, wordBreak: 'keep-all' }}>{project.tagline}</div>
        <div style={{ fontFamily: MONO, fontSize: 20, color: theme.color.darkAccent, marginTop: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.stack.join(' · ')}</div>
      </div>
    </div>
  );
}
