import {useMemo} from 'react';
import {Link} from 'react-router';
import {useDocStore, type Doc} from '@/store/docStore';

interface DocEntry {
  path: string;
  label: string;
}

function flattenDocs(docs: Doc[]): DocEntry[] {
  const sorted = [...docs].sort((a, b) => {
    if (a.project !== b.project) return a.project.localeCompare(b.project);
    if (a.section !== b.section) return a.section.localeCompare(b.section);
    return a.created_at.localeCompare(b.created_at);
  });
  return sorted.map((d) => ({
    path: `/docs/${d.project}/${d.section}/${d.slug}`,
    label: d.title,
  }));
}

export function DocNav({currentPath}: {currentPath: string}) {
  const docs = useDocStore((s) => s.docs);
  const allDocs = useMemo(() => flattenDocs(docs), [docs]);

  const idx = allDocs.findIndex((e) => e.path === currentPath);
  if (idx === -1) return null;

  const prev = idx > 0 ? allDocs[idx - 1] : null;
  const next = idx < allDocs.length - 1 ? allDocs[idx + 1] : null;

  if (!prev && !next) return null;

  return (
    <nav className="flex justify-between items-center px-6 py-8 mt-4 border-t border-[var(--color-border)]">
      {prev ? (
        <Link
          to={prev.path}
          className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] no-underline transition-colors"
        >
          ← {prev.label}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          to={next.path}
          className="flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] no-underline transition-colors"
        >
          {next.label} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
