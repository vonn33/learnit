import {useRef, useState} from 'react';
import {Link} from 'react-router';
import {
  type Tag,
  getTags,
} from '@/lib/storage';
import {downloadExport, importData} from '@/lib/exportImport';
import {hexToRgba} from '@/lib/highlights';
import {useAnnotationStore, type Annotation} from '@/store/annotationStore';
import {useDocStore} from '@/store/docStore';
import {TagManager} from '@/components/reader/TagManager';
import {Search, Tag as TagIcon, Download, Upload, X} from 'lucide-react';

export function HighlightsPage() {
  const annotations = useAnnotationStore((s) => s.annotations);
  const docs = useDocStore((s) => s.docs);
  const [tags, setTags] = useState<Tag[]>(() => getTags());
  const [query, setQuery] = useState('');
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = annotations.filter((h) => {
    const matchesTag = !activeTagId || h.tagIds.includes(activeTagId);
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      h.text.toLowerCase().includes(q) ||
      h.note.toLowerCase().includes(q);
    return matchesTag && matchesQuery;
  });

  async function handleDelete(id: string) {
    await useAnnotationStore.getState().removeAnnotation(id);
  }

  async function handleSaveNote(id: string) {
    await useAnnotationStore.getState().updateAnnotation(id, {note: editNote});
    setEditingId(null);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        void importData(data, 'merge').catch((e) => {
          console.error('Import failed:', e);
          alert('Import failed. Check console for details.');
        });
      } catch {
        alert('Invalid file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
          Annotations
          <span className="ml-2 text-sm font-normal text-[var(--color-muted-foreground)]">
            {annotations.length}
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTagManager((v) => !v)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors"
          >
            <TagIcon size={13} />
            Tags
          </button>
          <button
            onClick={downloadExport}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors"
          >
            <Download size={13} />
            Export
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors"
          >
            <Upload size={13} />
            Import
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      </div>

      {/* Tag Manager panel */}
      {showTagManager && (
        <div className="mb-6 p-4 rounded-xl border bg-[var(--color-card)]">
          <TagManager onClose={() => {setShowTagManager(false); setTags(getTags());}} />
        </div>
      )}

      {/* Search + tag filter */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search annotations…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--color-card)] border rounded-lg outline-none focus:ring-1 ring-[var(--color-ring)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <button
            onClick={() => setActiveTagId(null)}
            className={[
              'text-xs px-2.5 py-1.5 rounded-full border transition-colors',
              !activeTagId
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
            ].join(' ')}
          >
            All
          </button>
          {tags.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTagId(activeTagId === t.id ? null : t.id)}
              className={[
                'flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border transition-colors',
                activeTagId === t.id ? 'border-transparent' : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              ].join(' ')}
              style={activeTagId === t.id ? {background: t.color + '30', borderColor: t.color, color: t.color} : {}}
            >
              <span className="w-2 h-2 rounded-full" style={{background: t.color}} />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-muted-foreground)] text-sm">
          {annotations.length === 0
            ? 'No annotations yet. Select text on a doc page to create one.'
            : 'No annotations match your filter.'}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((h) => {
            const hTags = tags.filter((t) => h.tagIds.includes(t.id));
            const primaryColor = hTags[0]?.color ?? '#facc15';
            return (
              <div
                key={h.id}
                className="rounded-xl border bg-[var(--color-card)] overflow-hidden"
                style={{borderLeftColor: primaryColor, borderLeftWidth: 3}}
              >
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap gap-1.5">
                      {hTags.map((t) => (
                        <span
                          key={t.id}
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{background: hexToRgba(t.color, 0.2), color: t.color}}
                        >
                          {t.name}
                        </span>
                      ))}
                      {hTags.length === 0 && (
                        <span className="text-[10px] text-[var(--color-muted-foreground)]">Untagged</span>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {(() => {
                        const doc = docs.find((d) => d.id === h.docId);
                        if (!doc) return (
                          <span className="text-[10px] text-[var(--color-muted-foreground)]">Detached</span>
                        );
                        return (
                          <Link
                            to={`/docs/${doc.project}/${doc.section}/${doc.slug}#annotation-${h.id}`}
                            className="text-[10px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] no-underline"
                          >
                            {doc.title}
                          </Link>
                        );
                      })()}
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="p-0.5 text-[var(--color-muted-foreground)] hover:text-red-400 transition-colors"
                        aria-label="Delete highlight"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>

                  <blockquote
                    className="text-sm leading-relaxed mb-2 pl-2 border-l-2 italic text-[var(--color-foreground)]"
                    style={{borderColor: primaryColor + '80'}}
                  >
                    {h.text}
                  </blockquote>

                  {editingId === h.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        autoFocus
                        className="w-full text-sm bg-[var(--color-muted)] rounded px-3 py-2 resize-none outline-none focus:ring-1 ring-[var(--color-ring)] text-[var(--color-foreground)]"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveNote(h.id)}
                          className="text-xs px-3 py-1 rounded bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs px-3 py-1 rounded border text-[var(--color-muted-foreground)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : h.note ? (
                    <div
                      className="text-sm text-[var(--color-muted-foreground)] bg-[var(--color-muted)] rounded px-3 py-2 cursor-pointer hover:text-[var(--color-foreground)] transition-colors"
                      onClick={() => {setEditingId(h.id); setEditNote(h.note);}}
                    >
                      {h.note}
                    </div>
                  ) : (
                    <button
                      className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                      onClick={() => {setEditingId(h.id); setEditNote('');}}
                    >
                      + Add note
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
