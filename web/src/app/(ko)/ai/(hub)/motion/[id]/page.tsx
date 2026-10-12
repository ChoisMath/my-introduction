import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getContent } from '@me/content';
import { KeyNav } from '@/components/motion-gallery/KeyNav';
import { PromptCopy } from '@/components/motion-gallery/PromptCopy';
import { finalPrompt, type PromptState } from '@/components/motion-gallery/admin/placeholders';
import { getPromptAccess } from '@/lib/access';
import { getRenderedMotions } from '@/lib/media';
import { AI_MOTION, aiMotionPath } from '@/lib/ai-paths';

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
  const title = `${hit.item.name} · ${ui.sections.motion}`;
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
  const access = await getPromptAccess(item.id);
  const href = (m: { id: string } | null) => (m ? aiMotionPath(m.id) : null);
  return (
    <article className="px-2 py-6 sm:px-3 md:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <video data-testid="motion-video" src={item.video} poster={item.poster} controls playsInline preload="metadata" className="aspect-video w-full rounded-[var(--radius-card)] bg-black" />
        <header className="mt-4 flex items-baseline gap-x-3">
          <span className="shrink-0 font-mono text-sm text-muted">{String(item.no).padStart(2, '0')}</span>
          <h1 className="min-w-0 overflow-hidden text-2xl font-bold tracking-tight text-ellipsis whitespace-nowrap sm:text-3xl" title={item.name}>{item.name}</h1>
          <span className="min-w-0 shrink overflow-hidden text-sm text-ellipsis whitespace-nowrap text-muted" title={item.en}>{item.en}</span>
        </header>
        <p className="mt-1 text-sm text-muted">{item.use}</p>
        <p className="mt-4 leading-relaxed">{item.concept}</p>
        {access.status === 'allowed' ? (
          <PromptCopy
            id={item.id}
            status="allowed"
            prompts={access.data ? { en: finalPrompt(access.data, 'en', DEFAULT_PROMPT), ko: finalPrompt(access.data, 'ko', DEFAULT_PROMPT) } : null}
          />
        ) : (
          <PromptCopy id={item.id} status={access.status} member={access.member} />
        )}
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
