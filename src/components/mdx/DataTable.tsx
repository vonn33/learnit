interface DataTableProps {
  headers: string[];
  rows: string[][];
}

export function DataTable({headers, rows}: DataTableProps) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--color-muted)]">
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2.5 text-left font-semibold text-[var(--color-foreground)] border-b whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className={ri % 2 === 1 ? 'bg-[var(--color-card)]' : 'bg-transparent'}
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-[var(--color-foreground)] border-b last:border-b-0">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
