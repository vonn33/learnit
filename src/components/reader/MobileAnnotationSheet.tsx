import {useEffect, useRef, useState} from 'react';
import {Pencil} from 'lucide-react';
import {useTextSelection} from '@/lib/useTextSelection';
import {useTagStore} from '@/store/tagStore';
import {useAnnotationStore} from '@/store/annotationStore';
import {useDelayedUnmount} from '@/lib/useDelayedUnmount';
import {useClickOutside} from '@/lib/useClickOutside';
import {buildAnchorContext} from '@/lib/highlights';
import {Z} from '@/lib/zIndex';

interface MobileAnnotationSheetProps {
  pageUrl: string;
  topicId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function MobileAnnotationSheet({pageUrl, topicId: _topicId}: MobileAnnotationSheetProps) {
  const {selection, clear} = useTextSelection({
    containerSelector: 'article.prose',
    trigger: 'touch',
  });
  const tags = useTagStore((s) => s.tags);
  const addAnnotation = useAnnotationStore((s) => s.addAnnotation);
  // Used by Task 7 for click-outside detection and drag-to-dismiss
  const sheetRef = useRef<HTMLDivElement>(null);

  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const dragStartYRef = useRef<number | null>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);

  const visible = selection !== null;
  const shouldRender = useDelayedUnmount(visible, 180);

  useClickOutside(sheetRef, clear, {deferArm: true});

  // Reset per-selection UI state when a new selection arrives
  useEffect(() => {
    if (!selection) return;
    setSelectedTagId(null);
    setNoteMode(false);
    setNoteText('');
    setDragOffsetY(0);
  }, [selection]);

  // Focus the note input when note mode activates
  useEffect(() => {
    if (noteMode) noteInputRef.current?.focus();
  }, [noteMode]);

  async function handleHighlight() {
    if (!selection) return;
    await addAnnotation({
      type: 'highlight',
      docId: pageUrl,
      text: selection.text,
      anchorContext: buildAnchorContext(selection.savedRange),
      tagIds: selectedTagId ? [selectedTagId] : [],
      note: noteText,
      connectionUrl: '',
    });
    clear();
  }

  function handleCancel() {
    clear();
  }

  if (!shouldRender) return null;

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-label="Annotate selection"
      data-highlight-popover="true"
      className={[
        'fixed inset-x-0 bottom-0',
        'rounded-t-2xl border-t border-[var(--color-rule)] bg-[var(--color-card)]',
        'shadow-[0_-8px_32px_rgba(0,0,0,0.32)]',
        dragOffsetY === 0 ? 'transition-transform duration-[180ms] ease-out' : '',
      ].join(' ')}
      style={{
        zIndex: Z.TOPMOST,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        overscrollBehavior: 'contain',
        transform: visible
          ? `translateY(${dragOffsetY}px)`
          : 'translateY(100%)',
      }}
    >
      <div className="flex flex-col gap-2.5 px-4 pt-2 pb-3">
        {/* Drag handle */}
        <div
          className="mx-auto w-8 h-[3px] bg-[var(--color-rule)] rounded-full"
          onTouchStart={(e) => {
            dragStartYRef.current = e.touches[0].clientY;
          }}
          onTouchMove={(e) => {
            if (dragStartYRef.current === null) return;
            const dy = e.touches[0].clientY - dragStartYRef.current;
            setDragOffsetY(Math.max(0, dy));
          }}
          onTouchEnd={() => {
            if (dragOffsetY > 60) {
              clear();
            }
            setDragOffsetY(0);
            dragStartYRef.current = null;
          }}
          style={{touchAction: 'none'}}
        />

        {/* Selected-text excerpt */}
        <div className="border-l-2 border-[var(--color-rule)] pl-2 italic text-[11px] text-[var(--color-muted-foreground)] line-clamp-2">
          {'"'}<span>{selection?.text ?? ''}</span>{'"'}
        </div>

        {/* Tag pills (horizontal scroll) */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{WebkitOverflowScrolling: 'touch'}}>
          {tags.map((tag) => {
            const active = selectedTagId === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => setSelectedTagId(active ? null : tag.id)}
                className={[
                  'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px]',
                  active
                    ? 'border-transparent text-[var(--color-foreground)]'
                    : 'border-[var(--color-border)] text-[var(--color-muted-foreground)]',
                ].join(' ')}
                style={active ? {background: tag.color + '38', borderColor: tag.color} : {}}
              >
                <span className="h-2 w-2 rounded-full" style={{background: tag.color}} />
                {tag.name}
              </button>
            );
          })}
        </div>

        {/* Action row */}
        {noteMode ? (
          <>
            <input
              ref={noteInputRef}
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleHighlight();
                }
                if (e.key === 'Escape') {
                  setNoteMode(false);
                  setNoteText('');
                }
              }}
              placeholder="Add a note…"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-vellum)] px-3 py-2 text-[13px] text-[var(--color-foreground)] outline-none focus:ring-1 ring-[var(--color-primary)]/50"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleHighlight()}
                className="flex-1 rounded-lg bg-[var(--color-primary)] px-3 py-2.5 text-[13px] font-semibold text-[var(--color-primary-foreground)]"
              >
                Save highlight
              </button>
              <button
                type="button"
                aria-label="Cancel"
                onClick={handleCancel}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-[var(--color-muted-foreground)]"
              >
                ✕
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleHighlight()}
              className="flex-1 rounded-lg bg-[var(--color-primary)] px-3 py-2.5 text-[13px] font-semibold text-[var(--color-primary-foreground)]"
            >
              Highlight
            </button>
            <button
              type="button"
              aria-label="Add note"
              onClick={() => setNoteMode(true)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-[var(--color-foreground)]"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              aria-label="Cancel"
              onClick={handleCancel}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-[var(--color-muted-foreground)]"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
