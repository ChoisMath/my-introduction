'use client';

export type FilterOption = { value: string | null; label: string; count: number };

// 분류 거르기 한 벌: 모바일(<md)은 드롭다운 하나, 그 이상은 얇은 칩 줄. 둘 다 그리고 CSS 로 하나만 보인다.
export function FilterPicker({ label, options, value, onChange, testId }: {
  label: string;
  options: FilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  testId: string;
}) {
  return (
    <>
      <label className="min-w-0 flex-1 md:hidden">
        <span className="sr-only">{label}</span>
        <select
          data-testid={`${testId}-select`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="h-8 w-full max-w-56 rounded-full border border-line bg-bg px-3 text-sm"
        >
          {options.map((o) => (
            <option key={o.value ?? 'all'} value={o.value ?? ''}>{`${o.label} ${o.count}`}</option>
          ))}
        </select>
      </label>
      <div role="toolbar" aria-label={label} data-testid={testId} className="hidden min-w-0 flex-1 gap-2 overflow-x-auto pb-1 md:flex">
        {options.map((o) => {
          const isOn = value === o.value;
          return (
            <button
              key={o.value ?? 'all'}
              type="button"
              aria-pressed={isOn}
              onClick={() => onChange(o.value)}
              className={`min-h-8 shrink-0 rounded-full border px-3 text-sm whitespace-nowrap ${isOn ? 'border-fg bg-fg text-bg' : 'border-line hover:border-accent'}`}
            >
              {o.label} <span className="font-mono text-xs opacity-70">{o.count}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
