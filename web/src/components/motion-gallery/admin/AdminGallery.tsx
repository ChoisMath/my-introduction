'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { matchesQuery, type AdminListItem } from './admin-list';
import s from './admin.module.css';

const ALL = '전체';

function Card({ item, href }: { item: AdminListItem; href: string }) {
  const [isPlaying, setPlaying] = useState(false);
  const play = (e: React.SyntheticEvent<HTMLAnchorElement>) => {
    const v = e.currentTarget.querySelector('video');
    if (!v || !item.preview || !window.matchMedia('(hover: hover)').matches) return;
    if (!v.getAttribute('src')) v.src = item.preview;
    v.currentTime = 0;
    v.play().then(() => setPlaying(true)).catch(() => {});
  };
  const stop = (e: React.SyntheticEvent<HTMLAnchorElement>) => {
    e.currentTarget.querySelector('video')?.pause();
    setPlaying(false);
  };
  const no = String(item.no).padStart(2, '0');
  return (
    <Link href={href} prefetch={false} data-testid="admin-row" aria-label={`${no} ${item.name}`} className={`${s.card} ${isPlaying ? s.isPlaying : ''}`} onMouseEnter={play} onMouseLeave={stop}>
      <div className={s.media}>
        {item.poster ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- Volume 에서 스트리밍하는 버전 URL 이라 next/image 대상이 아니다 */}
            <img src={item.poster} alt="" loading="lazy" width={640} height={360} />
            {item.preview ? <video muted loop playsInline preload="none" aria-hidden /> : null}
          </>
        ) : (
          <div className={s.pending}>렌더 대기</div>
        )}
        <span className={s.no}>{no}</span>
        {item.poster ? null : <span className={`${s.badge} ${s.isWait}`}>대기</span>}
      </div>
      <div className={s.body}>
        <div className={s.name}>{item.name}</div>
        <div className={s.en}>{item.en}</div>
        <div className={s.use}>{item.use}</div>
      </div>
    </Link>
  );
}

export function AdminGallery({ items, groups, initialGroup, initialQuery, hasAdminData, canManage }: {
  items: AdminListItem[];
  groups: readonly string[];
  initialGroup: string;
  initialQuery: string;
  hasAdminData: boolean;
  canManage: boolean;
}) {
  const [group, setGroup] = useState(groups.includes(initialGroup) ? initialGroup : ALL);
  const [query, setQuery] = useState(initialQuery);
  const rendered = items.filter((i) => i.poster).length;
  const counts = useMemo(() => Object.fromEntries(groups.map((g) => [g, items.filter((i) => i.group === g).length])), [groups, items]);
  const list = items.filter((i) => (group === ALL || i.group === group) && matchesQuery(i, query));

  // 상세에서 이전/다음 순서와 닫기 위치를 같은 필터로 맞추려고 주소에 남긴다.
  const params = new URLSearchParams();
  if (group !== ALL) params.set('g', group);
  if (query.trim()) params.set('q', query.trim());
  const suffix = params.size ? `?${params}` : '';
  useEffect(() => {
    history.replaceState(null, '', `/motion/admin/${suffix}`);
  }, [suffix]);

  return (
    <div className={s.app}>
      <header className={s.top}>
        <h1>
          {/* eslint-disable-next-line @next/next/no-img-element -- 작은 픽토그램 */}
          <img src="/img/pictogram.webp" alt="" className={s.brandLogo} />
          모션 관리자<small>{items.length}개 스타일 · 렌더 {rendered}</small>
        </h1>
        <div className={s.search}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input type="search" placeholder="스타일·쓰임·컨셉 검색" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="검색" />
        </div>
        <span className={s.count}>{list.length} / {items.length}</span>
        {canManage ? <Link href="/motion/admin/viewers/" prefetch={false} className={s.manage} data-testid="viewers-link">열람자</Link> : null}
      </header>
      <div className={s.chips}>
        {[ALL, ...groups].map((g) => (
          <button key={g} type="button" aria-pressed={g === group} className={`${s.chip} ${g === group ? s.isOn : ''}`} onClick={() => setGroup(g)}>
            {g}<b>{g === ALL ? items.length : counts[g] ?? 0}</b>
          </button>
        ))}
      </div>
      <main className={s.main}>
        {hasAdminData ? null : (
          <p role="alert" className={s.alert}>관리자 데이터가 없습니다. 로컬에서 <code>npm run motion:import && npm run media:push</code> 를 실행하세요.</p>
        )}
        {list.length === 0 ? <div className={s.empty}>검색 결과가 없어요</div> : (group === ALL ? groups : [group]).map((g) => {
          const gl = list.filter((i) => i.group === g);
          if (!gl.length) return null;
          return (
            <section key={g}>
              <div className={s.groupH}><h2>{g}</h2><span>{gl.length}</span></div>
              <div className={s.grid}>
                {gl.map((i) => <Card key={i.id} item={i} href={`/motion/admin/${i.id}/${suffix}`} />)}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
