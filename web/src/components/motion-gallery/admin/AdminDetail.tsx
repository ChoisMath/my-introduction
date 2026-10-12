'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MotionAdmin, MotionPublic } from '@me/content';
import { FIELD_KEYS, TOGGLE_KEYS, finalPrompt, isToggleOn, parsePlaceholders, renderLines, type PromptLang, type PromptState } from './placeholders';
import type { ViewerState } from '@/lib/access';
import { AccountMenu } from '@/components/ai-hub/AccountMenu';
import s from './admin.module.css';

const STORAGE_KEY = 'cs.admin.prompt';
const SOUND_KEY = 'cs.admin.sound';
const INITIAL: PromptState & { lang: PromptLang } = { values: {}, toggles: {}, withTables: true, lang: 'en' };
const TABS = [['prompt', '프롬프트'], ['shots', '장면표'], ['cues', '소리 큐']] as const;
type Tab = (typeof TABS)[number][0];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장 실패는 무시 — 다음 방문에 기본값 */ }
}

const Icon = ({ d }: { d: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d={d} /></svg>
);

function NavLink({ href, label, d }: { href: string | null; label: string; d: string }) {
  if (!href) return <span className={`${s.ib} ${s.isDisabled}`} aria-hidden><Icon d={d} /></span>;
  return <Link href={href} prefetch={false} aria-label={label} className={s.ib}><Icon d={d} /></Link>;
}

function RowsTable({ rows, head, note }: { rows: [string, string, string][]; head: [string, string, string]; note: string }) {
  return (
    <div className={s.tWrap}>
      <div className={s.tNote}>{note}</div>
      <table className={s.table}>
        <thead><tr><th className={s.t}>{head[0]}</th><th>{head[1]}</th><th>{head[2]}</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}><td className={s.t}>{r[0]}</td><td className={s.p}>{r[1]}</td><td className={s.w}>{r[2]}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PromptPane({ item }: { item: MotionAdmin }) {
  const [state, setState] = useState(INITIAL);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const restore = () => setState({ ...INITIAL, ...readJson(STORAGE_KEY, {}) });
    restore();
  }, []);
  const update = (next: typeof INITIAL) => {
    setState(next);
    writeJson(STORAGE_KEY, next);
  };
  const src = state.lang === 'ko' ? item.ko : item.prompt;
  const defs = useMemo(() => parsePlaceholders(src), [src]);
  const text = finalPrompt(item, state.lang, state);
  const label = (f: { en: string; ko: string }) => (state.lang === 'ko' ? f.ko : f.en);
  const setValue = (key: string, value: string | null) => {
    const values = { ...state.values };
    if (value === null) delete values[key];
    else values[key] = value;
    update({ ...state, values });
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={s.pWrap}>
      <div className={s.box}>
        <div className={s.boxH}>
          <h3>내 채널</h3><span className={s.hint}>바꾼 값은 모든 스타일에 그대로 유지돼요</span><span className={s.sp} />
          <button type="button" className={s.resetAll} title="기본값으로" onClick={() => update({ ...INITIAL, withTables: state.withTables, lang: state.lang })}>초기화</button>
        </div>
        <div className={s.fields}>
          {FIELD_KEYS.filter((f) => defs[f.key]).map((f) => {
            const def = defs[f.key]?.def ?? '';
            const isEdited = Boolean(state.values[f.key]);
            return (
              <div key={f.key} className={`${s.f} ${isEdited ? s.isEdited : ''}`}>
                <label htmlFor={`f-${f.key}`}>
                  {label(f)}
                  {isEdited ? <button type="button" className={s.reset} onClick={() => setValue(f.key, null)}>기본값</button> : null}
                </label>
                <input
                  id={`f-${f.key}`}
                  type="text"
                  value={f.key in state.values ? state.values[f.key] : def}
                  placeholder={def}
                  onChange={(e) => setValue(f.key, e.target.value)}
                  onBlur={(e) => { if (!e.target.value) setValue(f.key, null); }}
                />
              </div>
            );
          })}
        </div>
        <div className={s.toggles}>
          {TOGGLE_KEYS.filter((t) => defs[t.key]).map((t) => {
            const on = isToggleOn(t.key, defs[t.key]?.flag ?? '', state.toggles);
            return (
              <button key={t.key} type="button" aria-pressed={on} title={defs[t.key]?.def} className={`${s.tg} ${on ? s.isOn : ''}`} onClick={() => update({ ...state, toggles: { ...state.toggles, [t.key]: !on } })}>
                <span className={s.dot} />{label(t)}
              </button>
            );
          })}
        </div>
      </div>
      <div className={s.box}>
        <div className={s.boxH}>
          <h3>완성 프롬프트</h3><span className={s.hint}>{text.length.toLocaleString()}자{state.withTables ? ' (표 포함)' : ''}</span><span className={s.sp} />
          <button type="button" aria-pressed={state.withTables} title="복사할 때 프롬프트 뒤에 장면표와 소리 큐를 마크다운 표로 붙입니다" className={`${s.tg} ${state.withTables ? s.isOn : ''}`} onClick={() => update({ ...state, withTables: !state.withTables })}>
            <span className={s.dot} />장면표·소리 큐 포함
          </button>
          <div className={s.seg}>
            {(['en', 'ko'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={state.lang === l} className={state.lang === l ? s.isOn : ''} onClick={() => update({ ...state, lang: l })}>{l === 'en' ? '영문' : '국문'}</button>
            ))}
          </div>
          <button type="button" data-testid="copy-prompt" className={`${s.copy} ${copied ? s.isDone : ''}`} onClick={copy}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
            <span>{copied ? '복사됨' : '복사'}</span>
          </button>
        </div>
        <pre data-testid="prompt-output" className={s.promptOut}>
          {renderLines(src, state).map((segs, i) => {
            const body = segs.map((seg, j) => (seg.mark ? <mark key={j} className={seg.mark === 'off' ? s.off : undefined}>{seg.text}</mark> : seg.text));
            return <span key={i}>{segs[0]?.text.startsWith('#') ? <span className={s.h}>{body}</span> : body}{'\n'}</span>;
          })}
        </pre>
      </div>
    </div>
  );
}

export function AdminDetail({ motion, data, media, pos, prevHref, nextHref, closeHref, account }: {
  account: ViewerState;
  motion: MotionPublic;
  data: MotionAdmin | null;
  media: { video: string; poster: string } | null;
  pos: string;
  prevHref: string | null;
  nextHref: string | null;
  closeHref: string;
}) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [tab, setTab] = useState<Tab>('prompt');
  const [sound, setSound] = useState(false);
  useEffect(() => {
    const restore = () => setSound(readJson(SOUND_KEY, false));
    restore();
  }, []);
  useEffect(() => {
    if (video.current) video.current.muted = !sound;
  }, [sound, media?.video]);
  const changeSound = (next: boolean) => {
    setSound(next);
    writeJson(SOUND_KEY, next);
    const v = video.current;
    if (v && next && v.paused) v.play().catch(() => {});
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (e.altKey || e.ctrlKey || e.metaKey || t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable)) return;
      if (e.key === 'Escape') router.push(closeHref);
      else if (e.key === 'ArrowLeft' && prevHref) router.push(prevHref);
      else if (e.key === 'ArrowRight' && nextHref) router.push(nextHref);
      else if (e.key === '1') setTab('prompt');
      else if (e.key === '2') setTab('shots');
      else if (e.key === '3') setTab('cues');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, closeHref, prevHref, nextHref]);

  const no = String(motion.no).padStart(2, '0');
  return (
    <section className={s.app} aria-label={`${no} ${motion.name}`}>
      <div className={s.dTop}>
        <Link href={closeHref} prefetch={false} aria-label="닫기" className={s.ib}><Icon d="M6 6l12 12M18 6 6 18" /></Link>
        <NavLink href={prevHref} label="이전" d="m15 6-6 6 6 6" />
        <NavLink href={nextHref} label="다음" d="m9 6 6 6-6 6" />
        <span className={s.pos}>{pos}</span>
        <h1 className={s.crumb}>{motion.group} › <b>{motion.name}</b></h1>
        {media ? (
          <button type="button" aria-pressed={sound} className={`${s.snd} ${sound ? s.isOn : ''}`} onClick={() => changeSound(!sound)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
            <span>{sound ? '소리 끄기' : '소리 켜기'}</span>
          </button>
        ) : null}
        {account.status === 'signedOut' ? null : <AccountMenu state={account} tone="dark" />}
      </div>
      <div className={s.dBody}>
        <div className={s.dLeft}>
          <div className={s.player}>
            {media ? (
              <video
                ref={video}
                key={media.video}
                src={media.video}
                poster={media.poster}
                muted
                autoPlay
                loop
                playsInline
                controls
                onVolumeChange={(e) => { if (e.currentTarget.muted === sound) changeSound(!e.currentTarget.muted); }}
              />
            ) : (
              <div className={s.pending}>아직 렌더하지 않은 스타일입니다</div>
            )}
          </div>
          {media ? <div className={s.videoNote}>Chois의 바이브코딩 렌더 영상 (HyperFrames, 이 프롬프트로 제작)</div> : null}
          <div className={s.dInfo}>
            <div className={s.tag}><b>{no}</b><span>{motion.group}</span></div>
            <h2>{motion.name}</h2>
            <div className={s.en}>{motion.en}</div>
            <dl className={s.kv}>
              <dt>쓰임</dt><dd>{motion.use}</dd>
              <dt className={s.concept}>컨셉</dt><dd className={s.concept}>{motion.concept}</dd>
            </dl>
          </div>
        </div>
        <div className={s.dRight}>
          <div role="tablist" className={s.tabs}>
            {TABS.map(([key, name]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={`${s.tab} ${tab === key ? s.isOn : ''}`} onClick={() => setTab(key)}>{name}</button>
            ))}
          </div>
          <div className={s.pane} role="tabpanel">
            {!data ? (
              <p role="alert" className={s.alert}>관리자 데이터가 없습니다. <code>npm run media:push</code> 를 실행하세요.</p>
            ) : tab === 'prompt' ? (
              <PromptPane item={data} />
            ) : tab === 'shots' ? (
              <RowsTable rows={data.shots} head={['시간(초)', '장면', '왜 이렇게']} note={`${data.shots.length}개 장면 · 10초`} />
            ) : (
              <RowsTable rows={data.cues} head={['시각(초)', '소리', '화면 이벤트']} note={`${data.cues.length}개 큐`} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
