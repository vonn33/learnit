import {Link} from 'react-router';
import manifest from '@/data/content-manifest.json';

type ManifestShape = Record<string, {sections: Record<string, {docs: string[]}>}>;

interface DocEntry {
  path: string;
  label: string;
}

function flattenManifest(): DocEntry[] {
  const entries: DocEntry[] = [];
  const m = manifest as ManifestShape;
  for (const [catKey, cat] of Object.entries(m)) {
    for (const [secKey, sec] of Object.entries(cat.sections)) {
      for (const slug of sec.docs) {
        entries.push({
          path: `/docs/${catKey}/${secKey}/${slug}`,
          label: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        });
      }
    }
  }
  return entries;
}

const ALL_DOCS = flattenManifest();

export function DocNav({currentPath}: {currentPath: string}) {
  const idx = ALL_DOCS.findIndex((e) => e.path === currentPath);
  if (idx === -1) return null;

  const prev = idx > 0 ? ALL_DOCS[idx - 1] : null;
  const next = idx < ALL_DOCS.length - 1 ? ALL_DOCS[idx + 1] : null;

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
