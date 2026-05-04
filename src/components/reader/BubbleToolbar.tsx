import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useTagStore, type Tag} from '@/store/tagStore';
import {
  buildAnchorContext,
  getHighlightColorForTags,
} from '@/lib/highlights';
import {clampToViewport} from '@/lib/positioning';
import {useDelayedUnmount} from '@/lib/useDelayedUnmount';
import {useMapStore} from '@/store/mapStore';
import {useAnnotationStore} from '@/store/annotationStore';
import {Zap, MapPin, ChevronDown, Link2, Pencil} from 'lucide-react';
import {NodePicker} from '@/components/map/NodePicker';

interface BubbleToolbarProps {
  pageUrl: string;
  topicId?: string;
}

export function BubbleToolbar({pageUrl, topicId = ''}: BubbleToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState({top: -9999, left: -9999});
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const tags = useTagStore((s) => s.tags);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNodePicker, setShowNodePicker] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addAnnotation = useAnnotationStore((s) => s.addAnnotation);
  const addNode = useMapStore((s) => s.addNode);
  const shouldRender = useDelayedUnmount(visible, 120);

  useEffect(() => {
    function onSelectionChange() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (toolbarRef.current?.contains(document.activeElement)) return;

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
        const anchor = sel.anchorNode;
        const el =
          anchor?.nodeType === Node.TEXT_NODE
            ? (anchor as Text).parentElement
            : (anchor as Element);
        if (!el?.closest('article.prose')) {
          setVisible(false);
          return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSavedRange(range.cloneRange());
        setSelectedText(text);
        setSelectionRect(rect);
        setSelectedTagId(null);
        setShowTagMenu(false);
        setShowNoteInput(false);
        setNoteText('');
        setShowNodePicker(false);
        setVisible(true);
      }, 80);
    }

    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!visible || !selectionRect || !toolbarRef.current) return;
    const {offsetWidth, offsetHeight} = toolbarRef.current;
    const result = clampToViewport({
      anchorRect: selectionRect,
      popoverWidth: offsetWidth,
      popoverHeight: offsetHeight,
      preferredPlacement: 'above',
      margin: 8,
    });
    setPos({top: result.top, left: result.left});
  }, [visible, selectionRect, showNoteInput, showTagMenu]);

  useEffect(() => {
    if (showNoteInput) noteInputRef.current?.focus();
  }, [showNoteInput]);

  const doHighlight = useCallback(
    async (note = '') => {
      if (!savedRange || !selectedText) return;
      const ancestor = savedRange.commonAncestorContainer;
      const ancestorEl = ancestor.nodeType === Node.TEXT_NODE
        ? ancestor.parentElement
        : ancestor as Element;
      const existingMark = ancestorEl?.closest('mark[data-annotation-id]') as HTMLElement | null;
      if (existingMark) {
        window.getSelection()?.removeAllRanges();
        setVisible(false);
        existingMark.click();
        return;
      }

      const newContext = buildAnchorContext(savedRange);
      await addAnnotation({
        type: 'highlight',
        docId: pageUrl,
        text: selectedText,
        anchorContext: newContext,
        tagIds: selectedTagId ? [selectedTagId] : [],
        note,
        connectionUrl: '',
      });
      window.getSelection()?.removeAllRanges();
      setVisible(false);
    },
    [savedRange, selectedText, selectedTagId, pageUrl, addAnnotation],
  );

  useEffect(() => {
    if (!visible) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showNoteInput) {
          setShowNoteInput(false);
          setNoteText('');
        } else {
          setVisible(false);
        }
        return;
      }
      if (e.key === 'Enter' && !showNoteInput) {
        e.preventDefault();
        void doHighlight();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible, showNoteInput, doHighlight]);

  async function handleCapture() {
    if (!topicId || !selectedText) return;
    const annotationId = await addAnnotation({
      docId: pageUrl,
      type: 'quick-capture',
      text: selectedText,
      anchorContext: savedRange ? buildAnchorContext(savedRange) : '',
      tagIds: [],
      note: '',
      connectionUrl: '',
    });
    addNode(topicId, {
      label: selectedText.slice(0, 60),
      type: 'concept',
      status: 'staged',
      annotationId,
    });
    window.getSelection()?.removeAllRanges();
    setVisible(false);
  }

  async function handleAddNode() {
    if (!topicId || !selectedText) return;
    const annotationId = await addAnnotation({
      docId: pageUrl,
      type: 'highlight',
      text: selectedText,
      anchorContext: savedRange ? buildAnchorContext(savedRange) : '',
      tagIds: [],
      note: '',
      connectionUrl: '',
    });
    const nodeId = await addNode(topicId, {
      label: selectedText.slice(0, 60),
      type: 'concept',
      status: 'placed',
      position: {x: 200, y: 200},
      annotationId,
    });
    await useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId});
    window.getSelection()?.removeAllRanges();
    setVisible(false);
  }

  function handleConnect() {
    setShowNodePicker(true);
  }

  async function handleNodeSelected(nodeId: string) {
    if (!topicId || !selectedText) return;
    const annotationId = await addAnnotation({
      docId: pageUrl,
      type: 'highlight',
      text: selectedText,
      anchorContext: savedRange ? buildAnchorContext(savedRange) : '',
      tagIds: [],
      note: '',
      connectionUrl: '',
    });
    useMapStore.getState().updateNode(topicId, nodeId, {annotationId});
    await useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId});
    setShowNodePicker(false);
    window.getSelection()?.removeAllRanges();
    setVisible(false);
  }

  const {bg: previewBg} = getHighlightColorForTags(
    selectedTagId ? [selectedTagId] : [],
    tags,
  );
  const selectedTag = tags.find((t) => t.id === selectedTagId);
  const isExiting = !visible && shouldRender;

  if (!shouldRender) return null;

  return (
    <div
      ref={toolbarRef}
      role="dialog"
      aria-label="Text actions"
      data-highlight-popover="true"
      className={[
        'fixed z-50 overflow-hidden',
        'rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card)]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.32),0_2px_8px_rgba(0,0,0,0.2)]',
        'transition-all duration-100',
        isExiting ? 'opacity-0 scale-95 translate-y-0.5' : 'opacity-100 scale-100 translate-y-0',
      ].join(' ')}
      style={{
        top: pos.top,
        left: pos.left,
        /* Warm top glow — like a lamp above the selection */
        boxShadow: isExiting
          ? undefined
          : '0 8px 32px rgba(0,0,0,0.30), 0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,220,180,0.10)',
      }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault();
      }}
    >
      {/* Top accent — warmth */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{background: 'linear-gradient(90deg, transparent, color-mix(in oklch, var(--color-primary) 60%, transparent) 50%, transparent)'}}
      />

      {/* Main action row */}
      <div className="flex items-center px-1.5 py-1.5 gap-0.5">
        {/* Tag swatch + picker */}
        <button
          onClick={() => setShowTagMenu((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-[var(--color-accent)] transition-colors group"
          title="Choose tag"
        >
          <span
            className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10 flex-shrink-0 transition-transform group-hover:scale-110"
            style={{background: previewBg}}
          />
          <ChevronDown size={10} className="text-[var(--color-muted-foreground)]" />
        </button>

        <span aria-hidden className="w-px h-4 bg-[var(--color-rule)] mx-0.5" />

        {/* Highlight — primary CTA */}
        <button
          onClick={() => void doHighlight()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
          title="Highlight selection (Enter)"
        >
          <span
            className="smallcaps text-[11px] tracking-[0.08em]"
          >
            {selectedTag ? `${selectedTag.name}` : 'Highlight'}
          </span>
        </button>

        {/* Note */}
        <button
          onClick={() => setShowNoteInput((v) => !v)}
          className={[
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-colors',
            showNoteInput
              ? 'bg-[var(--color-accent)] text-[var(--color-foreground)]'
              : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]',
          ].join(' ')}
          title="Add a note"
        >
          <Pencil size={12} />
        </button>

        {/* Map actions */}
        {topicId && (
          <>
            <span aria-hidden className="w-px h-4 bg-[var(--color-rule)] mx-0.5" />
            <button
              onClick={handleCapture}
              className="p-1.5 rounded-xl text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] hover:bg-[var(--color-accent)] transition-colors"
              title="Quick capture to map"
            >
              <Zap size={12} />
            </button>
            <button
              onClick={handleAddNode}
              className="p-1.5 rounded-xl text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] hover:bg-[var(--color-accent)] transition-colors"
              title="Add as map node"
            >
              <MapPin size={12} />
            </button>
            <button
              onClick={handleConnect}
              className="p-1.5 rounded-xl text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] hover:bg-[var(--color-accent)] transition-colors"
              title="Connect to existing node"
            >
              <Link2 size={12} />
            </button>
          </>
        )}
      </div>

      {/* Tag dropdown */}
      {showTagMenu && (
        <div className="border-t border-[var(--color-rule)] px-2.5 py-2.5 flex flex-wrap gap-1.5 max-w-[18rem]">
          <button
            onClick={() => {
              setSelectedTagId(null);
              setShowTagMenu(false);
            }}
            className={[
              'flex items-center gap-1.5 smallcaps text-[10px] tracking-[0.1em] px-2.5 py-1 rounded-full border transition-colors',
              !selectedTagId
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
            ].join(' ')}
          >
            None
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => {
                setSelectedTagId(selectedTagId === tag.id ? null : tag.id);
                setShowTagMenu(false);
              }}
              className={[
                'flex items-center gap-1.5 smallcaps text-[10px] tracking-[0.1em] px-2.5 py-1 rounded-full border transition-colors',
                selectedTagId === tag.id
                  ? 'border-transparent text-[var(--color-foreground)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              ].join(' ')}
              style={
                selectedTagId === tag.id
                  ? {background: tag.color + '38', borderColor: tag.color}
                  : {}
              }
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background: tag.color}} />
              {tag.name}
            </button>
          ))}
          {tags.length === 0 && (
            <span className="text-[11px] italic text-[var(--color-muted-foreground)]">No tags yet</span>
          )}
        </div>
      )}

      {/* Note input */}
      {showNoteInput && (
        <div className="border-t border-[var(--color-rule)] px-2.5 py-2 flex gap-2 items-center min-w-[18rem]">
          <input
            ref={noteInputRef}
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                void doHighlight(noteText);
              }
              if (e.key === 'Escape') {
                e.stopPropagation();
                setShowNoteInput(false);
                setNoteText('');
              }
            }}
            placeholder="Marginal note… ↵ to save"
            className="flex-1 font-prose text-[13px] bg-[var(--color-vellum)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 outline-none focus:ring-1 ring-[var(--color-primary)]/50 text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] placeholder:italic"
            style={{fontVariationSettings: '"opsz" 17'}}
          />
        </div>
      )}

      {/* Node picker */}
      {showNodePicker && topicId && (
        <div className="border-t border-[var(--color-rule)] p-2">
          <NodePicker
            topicId={topicId}
            onSelect={handleNodeSelected}
            onClose={() => setShowNodePicker(false)}
          />
        </div>
      )}
    </div>
  );
}
