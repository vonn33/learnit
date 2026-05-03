import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router';
import {useTagStore} from '@/store/tagStore';
import {useAnnotationStore} from '@/store/annotationStore';
import {useDocStore, type Doc} from '@/store/docStore';
import {Search, FileText, Tag} from 'lucide-react';

type Result = {
  type: 'doc' | 'highlight';
  label: string;
  sublabel?: string;
  path: string;
};

function humanize(s: string): string {
  return s
    .split('-')
    .map((w) => (w[0]?.toUpperCase() ?? '') + w.slice(1))
    .join(' ');
}

function buildDocResults(docs: Doc[]): Result[] {
  return docs.map((d) => ({
    type: 'doc' as const,
    label: d.title,
    sublabel: `${humanize(d.project)} › ${humanize(d.section)}`,
    path: `/docs/${d.project}/${d.section}/${d.slug}`,
  }));
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({open, onClose}: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const docs = useDocStore((s) => s.docs);

  useEffect(() => {
    if (!open) {setQuery(''); return;}

    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Global Cmd+K to open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!open) {
          // Signal parent — but we're called from Shell which passes the handler
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const q = query.toLowerCase().trim();
    const docResults = buildDocResults(docs);

    if (!q) {
      setResults(docResults.slice(0, 8));
      setActiveIdx(0);
      return;
    }

    const filtered: Result[] = [];

    // Doc pages — match against title, sublabel, and slug/project/section keys
    docs.forEach((d, i) => {
      const r = docResults[i];
      const haystack = [
        d.title,
        d.slug,
        d.project,
        d.section,
        r.sublabel ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (haystack.includes(q)) {
        filtered.push(r);
      }
    });

    // Highlights
    const tags = useTagStore.getState().tags;
    for (const h of useAnnotationStore.getState().annotations) {
      if (h.text.toLowerCase().includes(q) || h.note.toLowerCase().includes(q)) {
        const hTags = tags.filter((t) => h.tagIds.includes(t.id)).map((t) => t.name).join(', ');
        filtered.push({
          type: 'highlight',
          label: h.text.slice(0, 60) + (h.text.length > 60 ? '…' : ''),
          sublabel: hTags || h.docId,
          path: h.docId,
        });
      }
    }

    setResults(filtered.slice(0, 12));
    setActiveIdx(0);
  }, [query, docs]);

  function handleSelect(result: Result) {
    navigate(result.path);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIdx]) {
      handleSelect(results[activeIdx]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
        <div className="rounded-2xl border bg-[var(--color-card)] shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Search size={16} className="text-[var(--color-muted-foreground)] shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search docs and highlights…"
              className="flex-1 text-sm bg-transparent outline-none text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
            />
            <kbd className="text-[10px] text-[var(--color-muted-foreground)] bg-[var(--color-muted)] px-1.5 py-0.5 rounded border">
              ESC
            </kbd>
          </div>

          {/* Results */}
          {results.length > 0 ? (
            <div className="py-1 max-h-80 overflow-y-auto">
              {results.map((r, i) => (
                <button
                  key={r.path + r.label + i}
                  onClick={() => handleSelect(r)}
                  className={[
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    i === activeIdx ? 'bg-[var(--color-accent)]' : 'hover:bg-[var(--color-accent)]',
                  ].join(' ')}
                >
                  {r.type === 'doc' ? (
                    <FileText size={14} className="text-[var(--color-muted-foreground)] shrink-0" />
                  ) : (
                    <Tag size={14} className="text-[var(--color-muted-foreground)] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--color-foreground)] truncate">{r.label}</div>
                    {r.sublabel && (
                      <div className="text-[10px] text-[var(--color-muted-foreground)] truncate">{r.sublabel}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              No results for "{query}"
            </div>
          )}
        </div>
      </div>
    </>
  );
}
