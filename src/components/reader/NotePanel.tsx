import {useEffect, useRef, useState} from 'react';
import {type Tag, getHighlights} from '@/lib/storage';
import {updateHighlight, deleteHighlight, hexToRgba} from '@/lib/highlights';
import {X, Check} from 'lucide-react';

interface NotePanelProps {
  highlightId: string;
  anchorRect: DOMRect | null;
  tags: Tag[];
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function NotePanel({highlightId, anchorRect: _anchorRect, tags, onClose, onDelete}: NotePanelProps) {
  const [highlight, setHighlight] = useState(() =>
    getHighlights().find((h) => h.id === highlightId) ?? null,
  );
  const [note, setNote] = useState(highlight?.note ?? '');
  const [connectionUrl, setConnectionUrl] = useState(highlight?.connectionUrl ?? '');
  const [savedAt, setSavedAt] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const hl = getHighlights().find((h) => h.id === highlightId) ?? null;
    setHighlight(hl);
    setNote(hl?.note ?? '');
    setConnectionUrl(hl?.connectionUrl ?? '');
    setDeleteConfirm(false);
  }, [highlightId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [note]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  function save() {
    updateHighlight(highlightId, {note, connectionUrl});
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(0), 1500);
  }

  function handleDeleteClick() {
    if (deleteConfirm) {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      deleteHighlight(highlightId);
      onDelete(highlightId);
    } else {
      setDeleteConfirm(true);
      deleteTimerRef.current = setTimeout(() => setDeleteConfirm(false), 3000);
    }
  }

  if (!highlight) return null;

  const appliedTags = tags.filter((t) => highlight.tagIds.includes(t.id));

  return (
    <div
      data-note-panel="true"
      className="fixed right-4 top-16 z-50 w-80 rounded-xl border bg-[var(--color-card)] shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex flex-wrap gap-1.5">
          {appliedTags.length > 0 ? (
            appliedTags.map((t) => (
              <span
                key={t.id}
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{
                  background: hexToRgba(t.color, 0.15),
                  borderColor: t.color,
                  color: t.color,
                }}
              >
                {t.name}
              </span>
            ))
          ) : (
            <span className="text-xs text-[var(--color-muted-foreground)]">Untagged</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors shrink-0 ml-2"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Quote */}
      <blockquote className="mx-4 my-3 pl-3 border-l-2 border-[var(--color-border)] text-xs text-[var(--color-muted-foreground)] italic leading-relaxed">
        {highlight.selectedText.length > 200
          ? highlight.selectedText.slice(0, 200) + '…'
          : highlight.selectedText}
      </blockquote>

      {/* Note */}
      <div className="px-4 pb-2">
        <label className="block text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)] font-semibold mb-1.5">
          Note
        </label>
        <textarea
          ref={textareaRef}
          className="w-full text-sm bg-[var(--color-muted)] rounded px-3 py-2 resize-none outline-none focus:ring-1 ring-[var(--color-ring)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] transition-all"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onBlur={save}
          placeholder="Add a note, insight, or connection…"
          rows={3}
        />
        {savedAt > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-green-500 mt-1">
            <Check size={10} /> Saved
          </span>
        )}
      </div>

      {/* Link */}
      <div className="px-4 pb-3">
        <label className="block text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)] font-semibold mb-1.5">
          Link to (optional)
        </label>
        <input
          type="text"
          className="w-full text-xs bg-[var(--color-muted)] rounded px-3 py-2 outline-none focus:ring-1 ring-[var(--color-ring)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
          value={connectionUrl}
          onChange={(e) => setConnectionUrl(e.target.value)}
          onBlur={save}
          placeholder="/docs/path or https://..."
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-[var(--color-background)]">
        <span className="text-[10px] text-[var(--color-muted-foreground)]">
          {new Date(highlight.createdAt).toLocaleDateString()}
        </span>
        <button
          onClick={handleDeleteClick}
          className={[
            'text-xs px-3 py-1.5 rounded transition-colors',
            deleteConfirm
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'text-[var(--color-muted-foreground)] hover:text-red-400 border border-transparent hover:border-red-500/30',
          ].join(' ')}
        >
          {deleteConfirm ? 'Confirm delete?' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
