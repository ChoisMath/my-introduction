'use client';
import { useEffect, useMemo, useState } from 'react';
import type { MotionAdmin } from '@me/content';
import { FIELD_KEYS, TOGGLE_KEYS, finalPrompt, isToggleOn, parsePlaceholders, renderLines, type PromptLang, type PromptState } from './placeholders';
import { RowsTable } from './RowsTable';

const STORAGE_KEY = 'cs.admin.prompt';
const INITIAL: PromptState & { lang: PromptLang } = { values: {}, toggles: {}, withTables: true, lang: 'en' };
type Tab = 'prompt' | 'shots' | 'cues';

function loadState(): typeof INITIAL {
  try {
    return { ...INITIAL, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
  } catch {
    return INITIAL;
  }
}

const pill = (on: boolean) => `inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm whitespace-nowrap ${on ? 'border-fg bg-fg text-bg' : 'border-line'}`;

export function PromptPanel({ item }: { item: MotionAdmin }) {
  const [state, setState] = useState(INITIAL);
  const [tab, setTab] = useState<Tab>('prompt');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const restore = () => setState(loadState());
    restore();
  }, []);
  const update = (next: typeof INITIAL) => {
    setState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* 저장 실패는 무시 — 다음 방문에 기본값 */ }
  };
  const src = state.lang === 'ko' ? item.ko : item.prompt;
  const defs = useMemo(() => parsePlaceholders(src), [src]);
  const lines = renderLines(src, state);
  const text = finalPrompt(item, state.lang, state);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const label = (f: { en: string; ko: string }) => (state.lang === 'ko' ? f.ko : f.en);

  return (
    <section className="mt-6" aria-label="prompt">
      <div role="tablist" className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-2">
        {(['prompt', 'shots', 'cues'] as const).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={pill(tab === t)}>
            {{ prompt: '프롬프트', shots: '장면표', cues: '소리 큐' }[t]}
          </button>
        ))}
      </div>

      {tab === 'prompt' ? (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <aside className="flex flex-col gap-3">
            <div className="flex gap-2">
              {(['en', 'ko'] as const).map((l) => (
                <button key={l} type="button" aria-pressed={state.lang === l} onClick={() => update({ ...state, lang: l })} className={pill(state.lang === l)}>{l.toUpperCase()}</button>
              ))}
            </div>
            {FIELD_KEYS.filter((f) => defs[f.key]).map((f) => (
              <label key={f.key} className="flex flex-col gap-1 text-xs text-muted">
                <span className="whitespace-nowrap">{label(f)}</span>
                <input
                  className="min-h-11 rounded-md border border-line bg-bg px-3 text-sm text-fg"
                  value={state.values[f.key] ?? ''}
                  placeholder={defs[f.key]?.def}
                  onChange={(e) => update({ ...state, values: { ...state.values, [f.key]: e.target.value } })}
                />
              </label>
            ))}
            <div className="flex flex-wrap gap-2">
              {TOGGLE_KEYS.filter((t) => defs[t.key]).map((t) => {
                const on = isToggleOn(t.key, defs[t.key]?.flag ?? '', state.toggles);
                return (
                  <button key={t.key} type="button" aria-pressed={on} title={defs[t.key]?.def} onClick={() => update({ ...state, toggles: { ...state.toggles, [t.key]: !on } })} className={pill(on)}>
                    {label(t)}
                  </button>
                );
              })}
              <button type="button" aria-pressed={state.withTables} onClick={() => update({ ...state, withTables: !state.withTables })} className={pill(state.withTables)}>
                장면표·소리 큐 포함
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={copy} data-testid="copy-prompt" className={pill(true)}>{copied ? '복사됨' : '복사'}</button>
              <button type="button" onClick={() => update({ ...INITIAL, lang: state.lang })} className={pill(false)}>기본값</button>
              <span className="text-xs whitespace-nowrap text-muted">{text.length.toLocaleString()}자</span>
            </div>
          </aside>
          <pre data-testid="prompt-output" className="max-h-[70dvh] overflow-auto rounded-[var(--radius-card)] border border-line p-3 text-sm leading-relaxed whitespace-pre-wrap" style={{ wordBreak: 'keep-all' }}>
            {lines.map((segs, i) => (
              <span key={i} className={segs[0]?.text.startsWith('#') ? 'font-bold' : undefined}>
                {segs.map((s, j) => (s.mark ? <mark key={j} className={s.mark === 'off' ? 'bg-transparent text-muted line-through' : 'bg-accent-soft text-fg'}>{s.text}</mark> : <span key={j}>{s.text}</span>))}
                {'\n'}
              </span>
            ))}
          </pre>
        </div>
      ) : (
        <RowsTable
          caption={tab === 'shots' ? `${item.shots.length}개 장면 · 10초` : `${item.cues.length}개 큐`}
          head={tab === 'shots' ? ['시간(초)', '장면', '왜 이렇게'] : ['시각(초)', '소리', '화면 이벤트']}
          rows={tab === 'shots' ? item.shots : item.cues}
        />
      )}
    </section>
  );
}
