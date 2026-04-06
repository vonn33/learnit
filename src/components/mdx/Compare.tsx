interface Side {
  title: string;
  body: string;
}

interface CompareProps {
  left: Side;
  right: Side;
}

export function Compare({left, right}: CompareProps) {
  return (
    <div className="grid grid-cols-2 gap-0 my-4 rounded-lg border overflow-hidden">
      {[left, right].map((side, i) => (
        <div key={i} className={i === 0 ? 'border-r' : ''}>
          <div className="px-4 py-2 bg-[var(--color-muted)] text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] border-b">
            {side.title}
          </div>
          <div className="px-4 py-3 text-sm leading-relaxed text-[var(--color-foreground)]">
            {side.body}
          </div>
        </div>
      ))}
    </div>
  );
}
