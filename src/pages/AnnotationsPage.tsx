import {useRef, useState} from 'react';
import {Link} from 'react-router';
import {useTagStore} from '@/store/tagStore';
import {downloadExport, importData} from '@/lib/exportImport';
import {hexToRgba} from '@/lib/highlights';
import {useAnnotationStore, type Annotation} from '@/store/annotationStore';
import {useDocStore} from '@/store/docStore';
import {TagManager} from '@/components/reader/TagManager';
import {Search, Tag as TagIcon, Download, Upload, X, ArrowUpRight} from 'lucide-react';

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return '';
  const mins = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}

function EmptyMargins({filtered}: {filtered: boolean}) {
  return (
    <div className="py-24 text-center">
      <p
        className="font-display italic text-[var(--color-ink)] text-2xl mb-3"
        style={{fontVariationSettings: '"opsz" 72, "SOFT" 80, "wght" 420'}}
      >
        {filtered ? 'No notes match that filter.' : 'The margins are empty.'}
      </p>
      <p className="font-prose text-[13.5px] text-[var(--color-muted-foreground)] max-w-sm mx-auto leading-relaxed">
        {filtered
          ? 'Try a different search or clear the tag filter.'
          : 'Select any text while reading — a toolbar will appear to highlight, tag, and annotate.'}
      </p>
    </div>
  );
}

function AnnotationCard({
  annotation,
  onDelete,
  onEditNote,
}: {
  annotation: Annotation;
  onDelete: (id: string) => void;
  onEditNote: (id: string, note: string) => void;
}) {
  const docs = useDocStore((s) => s.docs);
  const tags = useTagStore((s) => s.tags);
  const [editingNote, setEditingNote] = useState(false);
  const [draft, setDraft] = useState('');
  const [hovering, setHovering] = useState(false);

  const hTags = tags.filter((t) => annotation.tagIds.includes(t.id));
  const primaryColor = hTags[0]?.color ?? '#c9a77c';
  const doc = docs.find((d) => d.id === annotation.docId);

  function startEdit() {
    setDraft(annotation.note);
    setEditingNote(true);
  }

  function saveEdit() {
    onEditNote(annotation.id, draft);
    setEditingNote(false);
  }

  return (
    <article
      className="group relative rounded-xl overflow-hidden bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-rule)] transition-colors"
      style={{borderLeftColor: primaryColor, borderLeftWidth: '3px'}}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Tag + meta row */}
      <header className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-0">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {hTags.length > 0 ? (
            hTags.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full shrink-0"
                style={{
                  background: hexToRgba(t.color, 0.18),
                  color: t.color,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{background: t.color}} />
                {t.name}
              </span>
            ))
          ) : (
            <span className="smallcaps text-[10px] tracking-[0.1em] text-[var(--color-muted-foreground)] opacity-70">
              Untagged
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {doc ? (
            <Link
              to={`/docs/${doc.project}/${doc.section}/${doc.slug}#annotation-${annotation.id}`}
              className="group/link flex items-center gap-1 smallcaps text-[10px] tracking-[0.1em] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition-colors no-underline"
            >
              <span className="max-w-[12rem] truncate">{doc.title}</span>
              <ArrowUpRight size={9} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
            </Link>
          ) : (
            <span className="smallcaps text-[10px] text-[var(--color-muted-foreground)] opacity-50">Detached</span>
          )}
          <button
            onClick={() => onDelete(annotation.id)}
            className={[
              'p-0.5 rounded transition-all text-[var(--color-muted-foreground)]',
              hovering ? 'opacity-100 hover:text-[var(--color-destructive)]' : 'opacity-0',
            ].join(' ')}
            aria-label="Delete annotation"
          >
            <X size={11} />
          </button>
        </div>
      </header>

      {/* Quote */}
      <blockquote
        className="font-prose italic text-[15px] leading-[1.6] text-[var(--color-foreground)] mx-4 my-3 pl-3 border-l"
        style={{
          fontVariationSettings: '"opsz" 17, "wght" 400',
          borderColor: primaryColor + 'aa',
        }}
      >
        {annotation.text}
      </blockquote>

      {/* Note */}
      <div className="px-4 pb-3.5">
        {editingNote ? (
          <div className="flex flex-col gap-2">
            <textarea
              autoFocus
              className="w-full text-[13px] bg-[var(--color-vellum)] rounded-md px-3 py-2 resize-none outline-none focus:ring-1 ring-[var(--color-primary)]/50 text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] font-sans border border-[var(--color-border)]"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit();
                if (e.key === 'Escape') setEditingNote(false);
              }}
              rows={3}
              placeholder="Your marginal note… (⌘↵ to save)"
            />
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="text-[11px] smallcaps tracking-[0.08em] px-3 py-1 rounded-md bg-[var(--color-primary)] text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90"
              >
                Save
              </button>
              <button
                onClick={() => setEditingNote(false)}
                className="text-[11px] smallcaps tracking-[0.08em] px-3 py-1 rounded-md border text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : annotation.note ? (
          <div
            className="text-[13px] text-[var(--color-muted-foreground)] bg-[var(--color-vellum)] rounded-md px-3 py-2 cursor-pointer hover:text-[var(--color-foreground)] border border-[var(--color-border)] transition-colors"
            onClick={startEdit}
            title="Click to edit note"
          >
            {annotation.note}
          </div>
        ) : (
          <button
            className="smallcaps text-[10px] tracking-[0.12em] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition-colors"
            onClick={startEdit}
          >
            + Add marginal note
          </button>
        )}
      </div>

      {/* Timestamp — bottom right, very quiet */}
      <footer className="absolute bottom-2.5 right-4">
        <span
          className="font-mono text-[10px] text-[var(--color-muted-foreground)] opacity-50"
          style={{fontVariationSettings: '"MONO" 1'}}
        >
          {timeAgo(annotation.createdAt)}
        </span>
      </footer>
    </article>
  );
}

export function AnnotationsPage() {
  const annotations = useAnnotationStore((s) => s.annotations);
  const tags = useTagStore((s) => s.tags);
  const updateAnnotation = useAnnotationStore((s) => s.updateAnnotation);
  const removeAnnotation = useAnnotationStore((s) => s.removeAnnotation);

  const [query, setQuery] = useState('');
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = annotations.filter((h) => {
    const matchesTag = !activeTagId || h.tagIds.includes(activeTagId);
    const q = query.toLowerCase();
    const matchesQuery =
      !q || h.text.toLowerCase().includes(q) || h.note.toLowerCase().includes(q);
    return matchesTag && matchesQuery;
  });

  async function handleDelete(id: string) {
    await removeAnnotation(id);
  }

  async function handleEditNote(id: string, note: string) {
    await updateAnnotation(id, {note});
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        void importData(data, 'merge').catch((err) => {
          console.error('Import failed:', err);
          alert('Import failed. Check console.');
        });
      } catch {
        alert('Invalid file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const hasFilters = !!query || !!activeTagId;

  return (
    <div className="max-w-3xl mx-auto px-6 sm:px-10 py-12 flex flex-col gap-8 ink-in">
      {/* Masthead */}
      <header className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div className="flex items-baseline gap-3">
            <h1
              className="font-display italic text-[var(--color-ink)] text-4xl leading-none"
              style={{fontVariationSettings: '"opsz" 144, "SOFT" 70, "wght" 440'}}
            >
              The Margins
            </h1>
            <span
              className="font-mono text-[var(--color-primary)] text-xl tabular-nums leading-none"
              style={{fontVariationSettings: '"MONO" 1, "wght" 400'}}
            >
              {annotations.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTagManager((v) => !v)}
              className={[
                'flex items-center gap-1.5 smallcaps text-[11px] tracking-[0.1em] px-3 py-1.5 rounded-md border transition-colors',
                showTagManager
                  ? 'bg-[var(--color-accent)] text-[var(--color-foreground)] border-[var(--color-rule)]'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] border-[var(--color-border)]',
              ].join(' ')}
            >
              <TagIcon size={12} />
              Tags
            </button>
            <button
              onClick={downloadExport}
              className="flex items-center gap-1.5 smallcaps text-[11px] tracking-[0.1em] px-3 py-1.5 rounded-md border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              <Download size={12} />
              Export
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 smallcaps text-[11px] tracking-[0.1em] px-3 py-1.5 rounded-md border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              <Upload size={12} />
              Import
            </button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          </div>
        </div>

        {/* Hairline rule */}
        <div className="h-px bg-gradient-to-r from-[var(--color-primary)]/30 via-[var(--color-rule)] to-transparent mt-1" />
      </header>

      {/* Tag Manager */}
      {showTagManager && (
        <div className="p-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-card)]">
          <TagManager onClose={() => setShowTagManager(false)} />
        </div>
      )}

      {/* Search + tag filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the margins…"
            className="w-full pl-9 pr-3 py-2 font-prose text-[13.5px] bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg outline-none focus:ring-1 ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]/50 text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] transition-colors"
            style={{fontVariationSettings: '"opsz" 17'}}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <button
            onClick={() => setActiveTagId(null)}
            className={[
              'smallcaps text-[10px] tracking-[0.1em] px-3 py-1.5 rounded-full border transition-colors',
              !activeTagId
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent'
                : 'text-[var(--color-muted-foreground)] border-[var(--color-border)] hover:text-[var(--color-foreground)]',
            ].join(' ')}
          >
            All
          </button>
          {tags.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTagId(activeTagId === t.id ? null : t.id)}
              className={[
                'flex items-center gap-1.5 smallcaps text-[10px] tracking-[0.1em] px-3 py-1.5 rounded-full border transition-colors',
                activeTagId === t.id
                  ? 'border-transparent'
                  : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              ].join(' ')}
              style={
                activeTagId === t.id
                  ? {background: t.color + '28', borderColor: t.color, color: t.color}
                  : {}
              }
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background: t.color}} />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <EmptyMargins filtered={hasFilters} />
      ) : (
        <div className="flex flex-col gap-3 ink-stagger">
          {filtered.map((annotation) => (
            <AnnotationCard
              key={annotation.id}
              annotation={annotation}
              onDelete={handleDelete}
              onEditNote={handleEditNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}
