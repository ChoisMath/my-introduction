import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getContent } from '@me/content';
import { KeyNav } from '@/components/motion-gallery/KeyNav';
import { PromptCopy } from '@/components/motion-gallery/PromptCopy';
import { finalPrompt, type PromptState } from '@/components/motion-gallery/admin/placeholders';
import { getViewerState, isMember } from '@/lib/access';
import { getRenderedMotions } from '@/lib/media';
import { readMotionAdmin } from '@/lib/motion-admin';
import { AI_MOTION, aiMotionPath } from '@/lib/ai-paths';
import { volumeRoot } from '@/lib/volume';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const items = await getRenderedMotions();
  const i = items.findIndex((m) => m.id === id);
  if (i < 0) return null;
  return { item: items[i]!, prev: items[i - 1] ?? null, next: items[i + 1] ?? null };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const hit = await load((await params).id);
  if (!hit) return {};
  const { ui } = getContent('ko');
  const title = `${hit.item.name} · ${ui.motion.title}`;
  const url = aiMotionPath(hit.item.id);
  return {
    title,
    description: hit.item.concept,
    alternates: { canonical: url },
    openGraph: { type: 'video.other', title, description: hit.item.concept, url, images: [{ url: hit.item.poster, width: 1280, height: 720 }] },
  };
}

// 관리자 상세의 기본 복사와 같은 결과(빈칸 기본값, 장면표·소리 큐 포함).
const DEFAULT_PROMPT: PromptState = { values: {}, toggles: {}, withTables: true };

const navLink = 'inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent';

export default async function MotionDetailPage({ params }: Props) {
  const hit = await load((await params).id);
  if (!hit) notFound();
  const { ui } = getContent('ko');
  const { item, prev, next } = hit;
  // 프롬프트는 공개(오빠두엑셀 허락). 회원 여부는 「빈칸 편집·장면표」 링크를 보일지에만 쓴다.
  const [viewer, list] = await Promise.all([getViewerState(), readMotionAdmin(volumeRoot())]);
  const data = list?.find((a) => a.id === item.id) ?? null;
  const href = (m: { id: string } | null) => (m ? aiMotionPath(m.id) : null);
  return (
    <article className="px-2 py-6 sm:px-3 md:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <video data-testid="motion-video" src={item.video} poster={item.poster} controls playsInline preload="metadata" className="aspect-video w-full rounded-[var(--radius-card)] bg-black" />
        <header className="mt-4 flex items-baseline gap-x-3">
          <span className="shrink-0 font-mono text-sm text-muted">{String(item.no).padStart(2, '0')}</span>
          <h2 className="min-w-0 overflow-hidden text-2xl font-bold tracking-tight text-ellipsis whitespace-nowrap sm:text-3xl" title={item.name}>{item.name}</h2>
          <span className="min-w-0 shrink overflow-hidden text-sm text-ellipsis whitespace-nowrap text-muted" title={item.en}>{item.en}</span>
        </header>
        <p className="mt-1 text-sm text-muted">{item.use}</p>
        <p className="mt-4 leading-relaxed">{item.concept}</p>
        <PromptCopy
          id={item.id}
          canEdit={isMember(viewer)}
          prompts={data ? { en: finalPrompt(data, 'en', DEFAULT_PROMPT), ko: finalPrompt(data, 'ko', DEFAULT_PROMPT) } : null}
        />
        <nav className="mt-6 flex flex-wrap items-center gap-2" aria-label="motion">
          {prev ? <Link href={href(prev)!} className={navLink}>← {ui.motion.prev}</Link> : null}
          <Link href={AI_MOTION} className={navLink}>{ui.motion.back}</Link>
          {next ? <Link href={href(next)!} className={navLink}>{ui.motion.next} →</Link> : null}
        </nav>
        <KeyNav prevHref={href(prev)} nextHref={href(next)} />
      </div>
    </article>
  );
}
