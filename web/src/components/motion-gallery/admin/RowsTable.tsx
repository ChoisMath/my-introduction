export function RowsTable({ head, rows, caption }: { head: [string, string, string]; rows: [string, string, string][]; caption: string }) {
  return (
    <div className="max-h-[70dvh] overflow-auto rounded-[var(--radius-card)] border border-line">
      <table className="data-table">
        <caption className="px-3 py-2 text-left text-xs whitespace-nowrap text-muted">{caption}</caption>
        <thead>
          <tr>
            <th className="sticky-col">{head[0]}</th>
            <th>{head[1]}</th>
            <th>{head[2]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="sticky-col font-mono">{r[0]}</td>
              <td className="prose-cell">{r[1]}</td>
              <td className="prose-cell text-muted">{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
