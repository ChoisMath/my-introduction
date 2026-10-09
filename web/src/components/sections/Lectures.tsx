'use client';
import { useState } from 'react';
import type { Profile, TimelineItem, Ui } from '@me/content';
import { Section } from '../Section';

type Tab = 'teacher' | 'student';

function Table({ rows, ui }: { rows: TimelineItem[]; ui: Ui }) {
  return (
    <div className="max-h-[70dvh] overflow-auto rounded-[var(--radius-card)] border border-line">
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
    </div>
  );
}

export function Lectures({ profile, ui }: { profile: Profile; ui: Ui }) {
  const [tab, setTab] = useState<Tab>('teacher');
  const rows = tab === 'teacher' ? profile.lecturesTeacher : profile.lecturesStudent;
  return (
    <Section id="lectures" title={ui.sections.lectures}>
      <div role="tablist" className="mb-3 flex gap-2">
        {(['teacher', 'student'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-11 rounded-full px-4 text-sm whitespace-nowrap ${tab === t ? 'bg-accent text-bg' : 'border border-line text-muted'}`}
          >
            {ui.lectures[t]} ({t === 'teacher' ? profile.lecturesTeacher.length : profile.lecturesStudent.length})
          </button>
        ))}
      </div>
      <Table rows={rows} ui={ui} />
    </Section>
  );
}
