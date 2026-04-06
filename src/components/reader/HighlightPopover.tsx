import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {type Tag, getTags} from '@/lib/storage';
import {
  createHighlight,
  buildAnchorContext,
  getHighlightColorForTags,
} from '@/lib/highlights';
import {clampToViewport} from '@/lib/positioning';
import {useDelayedUnmount} from '@/lib/useDelayedUnmount';

interface HighlightPopoverProps {
  pageUrl: string;
  onHighlightCreated: () => void;
}

export function HighlightPopover({pageUrl, onHighlightCreated}: HighlightPopoverProps) {
  const [visible, setVisible] = useState(false);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState({top: -9999, left: -9999});
  const [placement, setPlacement] = useState<'above' | 'below'>('above');
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [quickNote, setQuickNote] = useState('');
  const [showQuickNote, setShowQuickNote] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const quickNoteRef = useRef<HTMLTextAreaElement>(null);
  const shouldRender = useDelayedUnmount(visible, 100);

  useEffect(() => {
    setTags(getTags());

    function onMouseUp(e: MouseEvent) {
      if (
        popoverRef.current?.contains(e.target as Node) ||
        (e.target as HTMLElement).closest('[data-note-panel]')
      ) return;

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setVisible(false);
        return;
      }

      const text = sel.toString().trim();
      if (text.length < 3) {
        setVisible(false);
        return;
      }

      const range = sel.getRangeAt(0);
      const container = range.commonAncestorContainer as HTMLElement;
      if (!container.closest?.('article.prose')) {
        setVisible(false);
        return;
      }

      const rect = range.getBoundingClientRect();
      setSavedRange(range.cloneRange());
      setSelectedText(text);
      setSelectedTagIds([]);
      setQuickNote('');
      setShowQuickNote(false);
      setSelectionRect(rect);
      setVisible(true);
    }

    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);

  useLayoutEffect(() => {
    if (!visible || !selectionRect || !popoverRef.current) return;
    const {offsetWidth, offsetHeight} = popoverRef.current;
    const result = clampToViewport({
      anchorRect: selectionRect,
      popoverWidth: offsetWidth,
      popoverHeight: offsetHeight,
      preferredPlacement: 'above',
      margin: 8,
    });
    setPos({top: result.top, left: result.left});
    setPlacement(result.placement);
  }, [visible, selectionRect, showQuickNote]);

  useEffect(() => {
    if (!visible) return;
    function onDoc(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    }
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setVisible(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible]);

  useEffect(() => {
    if (showQuickNote) quickNoteRef.current?.focus();
  }, [showQuickNote]);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function saveHighlight() {
    if (!savedRange || !selectedText) return;
    createHighlight({
      pageUrl,
      selectedText,
      tagIds: selectedTagIds,
      note: quickNote,
      connectionUrl: '',
      anchorContext: buildAnchorContext(savedRange),
      charOffsetStart: 0,
      charOffsetEnd: 0,
    });
    window.getSelection()?.removeAllRanges();
    setVisible(false);
    onHighlightCreated();
  }

  const {bg} = getHighlightColorForTags(selectedTagIds, tags);
  const isExiting = !visible && shouldRender;

  if (!shouldRender) return null;

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Highlight options"
      data-highlight-popover="true"
      className={[
        'fixed z-50 w-64 rounded-xl border bg-[var(--color-card)] shadow-xl p-3 flex flex-col gap-2',
        'transition-all duration-100',
        isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100',
        placement === 'below' ? 'origin-top' : 'origin-bottom',
      ].join(' ')}
      style={{top: pos.top, left: pos.left}}
    >
      {/* Selection preview */}
      <div
        className="text-xs rounded px-2 py-1.5 line-clamp-2 text-[var(--color-foreground)]"
        style={{background: bg}}
      >
        {selectedText.slice(0, 80)}{selectedText.length > 80 ? '…' : ''}
      </div>

      <div className="h-px bg-[var(--color-border)]" />

      {/* Tag selection */}
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)] font-semibold">Tags</div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const selected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              role="checkbox"
              aria-checked={selected}
              onClick={() => toggleTag(tag.id)}
              className={[
                'flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors',
                selected
                  ? 'border-transparent text-[var(--color-foreground)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              ].join(' ')}
              style={selected ? {background: tag.color + '40', borderColor: tag.color} : {}}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{background: tag.color}}
              />
              {tag.name}
            </button>
          );
        })}
      </div>

      <div className="h-px bg-[var(--color-border)]" />

      {/* Quick note */}
      {showQuickNote ? (
        <textarea
          ref={quickNoteRef}
          className="w-full text-xs bg-[var(--color-muted)] rounded px-2 py-1.5 resize-none outline-none text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
          value={quickNote}
          onChange={(e) => {
            setQuickNote(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          placeholder="Add a note…"
          rows={2}
        />
      ) : (
        <button
          className="text-xs text-left text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          onClick={() => setShowQuickNote(true)}
        >
          + Add note…
        </button>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={saveHighlight}
          className="flex-1 text-xs font-medium rounded px-3 py-1.5 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
        >
          Save highlight
        </button>
        <button
          onClick={() => setVisible(false)}
          className="text-xs px-3 py-1.5 rounded border text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
