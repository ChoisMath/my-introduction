'use client';
import { useState, type KeyboardEvent } from 'react';
import type { Profile, TimelineItem, Ui } from '@me/content';
import { Section } from '../Section';

const TABS = ['teacher', 'student'] as const;
type Tab = (typeof TABS)[number];

function Table({ rows, ui }: { rows: TimelineItem[]; ui: Ui }) {
  return (
    <table className="data-table">
      <thead>
        <tr><th className="sticky-col">{ui.lectures.period}</th><th>{ui.lectures.title}</th><th>{ui.lectures.org}</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="sticky-col font-mono text-xs text-muted">{r.period}</td>
            <td>{r.title}{r.detail ? <span className="block text-xs text-muted">{r.detail}</span> : null}</td>
            <td className="text-muted">{r.org ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Lectures({ profile, ui }: { profile: Profile; ui: Ui }) {
  const [tab, setTab] = useState<Tab>('teacher');
  const rows = tab === 'teacher' ? profile.lecturesTeacher : profile.lecturesStudent;
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = TABS[(TABS.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length] as Tab;
    setTab(next);
    document.getElementById(`lectures-tab-${next}`)?.focus();
  };
  return (
    <Section id="lectures" title={ui.sections.lectures}>
      <div role="tablist" aria-label={ui.sections.lectures} className="mb-3 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            id={`lectures-tab-${t}`}
            role="tab"
            aria-selected={tab === t}
            aria-controls={`lectures-panel-${t}`}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            onKeyDown={onKeyDown}
            className={`min-h-11 rounded-full px-4 text-sm whitespace-nowrap ${tab === t ? 'bg-accent text-bg' : 'border border-line text-muted'}`}
          >
            {ui.lectures[t]} ({t === 'teacher' ? profile.lecturesTeacher.length : profile.lecturesStudent.length})
          </button>
        ))}
      </div>
      <div id={`lectures-panel-${tab}`} role="tabpanel" aria-labelledby={`lectures-tab-${tab}`} className="max-h-[70dvh] overflow-auto rounded-[var(--radius-card)] border border-line">
        <Table rows={rows} ui={ui} />
      </div>
    </Section>
  );
}
