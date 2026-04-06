import {Info} from 'lucide-react';

interface CalloutProps {
  label?: string;
  children: React.ReactNode;
}

export function Callout({label, children}: CalloutProps) {
  return (
    <div className="flex gap-3 rounded-lg border bg-[var(--color-card)] px-4 py-3 my-4">
      <Info size={16} className="mt-0.5 shrink-0 text-[var(--color-muted-foreground)]" />
      <div>
        {label && (
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-1">
            {label}
          </div>
        )}
        <div className="text-sm leading-relaxed text-[var(--color-foreground)]">{children}</div>
      </div>
    </div>
  );
}
