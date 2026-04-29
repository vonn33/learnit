import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {type Tag, getTags, getHighlightsForPage} from '@/lib/storage';
import {
  createHighlight,
  buildAnchorContext,
  getHighlightColorForTags,
  applyHighlightsToDOM,
} from '@/lib/highlights';
import {clampToViewport} from '@/lib/positioning';
import {useDelayedUnmount} from '@/lib/useDelayedUnmount';
import {useMapStore} from '@/store/mapStore';
import {useAnnotationStore} from '@/store/annotationStore';
import {Zap, MapPin, ChevronDown, Link2} from 'lucide-react';
import {NodePicker} from '@/components/map/NodePicker';

interface BubbleToolbarProps {
  pageUrl: string;
  onHighlightCreated: () => void;
  topicId?: string;
}

export function BubbleToolbar({pageUrl, onHighlightCreated, topicId = ''}: BubbleToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState({top: -9999, left: -9999});
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
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
  const shouldRender = useDelayedUnmount(visible, 100);

  useEffect(() => {
    setTags(getTags());

    function onSelectionChange() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        // Don't hide if focus is inside our toolbar (e.g. note input is focused)
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
    (note = '') => {
      if (!savedRange || !selectedText) return;
      const tagIds = selectedTagId ? [selectedTagId] : [];
      createHighlight({
        pageUrl,
        selectedText,
        tagIds,
        note,
        connectionUrl: '',
        anchorContext: buildAnchorContext(savedRange),
        charOffsetStart: 0, // required by type; not used for anchoring (anchorContext is used instead)
        charOffsetEnd: 0,   // required by type; not used for anchoring (anchorContext is used instead)
      });
      const container = document.querySelector('article.prose') as HTMLElement | null;
      if (container) {
        const allTags = getTags();
        const highlights = getHighlightsForPage(pageUrl);
        applyHighlightsToDOM(highlights, container, allTags);
      }
      window.getSelection()?.removeAllRanges();
      setVisible(false);
      onHighlightCreated();
    },
    [savedRange, selectedText, selectedTagId, pageUrl, onHighlightCreated],
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
        doHighlight();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible, showNoteInput, doHighlight]);

  function handleCapture() {
    if (!topicId || !selectedText) return;
    const annotationId = addAnnotation({
      docId: pageUrl,
      position: {start: 0, end: 0},
      type: 'quick-capture',
      text: selectedText,
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

  function handleAddNode() {
    if (!topicId || !selectedText) return;
    const annotationId = addAnnotation({
      docId: pageUrl,
      position: {start: 0, end: 0},
      type: 'highlight',
      text: selectedText,
    });
    const nodeId = addNode(topicId, {
      label: selectedText.slice(0, 60),
      type: 'concept',
      status: 'placed',
      position: {x: 200, y: 200},
      annotationId,
    });
    useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId});
    window.getSelection()?.removeAllRanges();
    setVisible(false);
    onHighlightCreated();
  }

  function handleConnect() {
    setShowNodePicker(true);
  }

  function handleNodeSelected(nodeId: string) {
    if (!topicId || !selectedText) return;
    const annotationId = addAnnotation({
      docId: pageUrl,
      position: {start: 0, end: 0},
      type: 'highlight',
      text: selectedText,
    });
    useMapStore.getState().updateNode(topicId, nodeId, {annotationId});
    useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId});
    setShowNodePicker(false);
    window.getSelection()?.removeAllRanges();
    setVisible(false);
    onHighlightCreated();
  }

  const {bg: previewBg, border: previewBorder} = getHighlightColorForTags(
    selectedTagId ? [selectedTagId] : [],
    tags,
  );
  const isExiting = !visible && shouldRender;

  if (!shouldRender) return null;

  return (
    <div
      ref={toolbarRef}
      role="dialog"
      aria-label="Text actions"
      data-highlight-popover="true"
      className={[
        'fixed z-50 rounded-xl border bg-[var(--color-card)] shadow-xl overflow-hidden',
        'transition-all duration-100',
        isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100',
      ].join(' ')}
      style={{top: pos.top, left: pos.left}}
      // Prevent mousedown from collapsing the selection before button clicks fire
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault();
      }}
    >
      {/* Main action row */}
      <div className="flex items-center gap-0 px-1 py-1">
        {/* Tag picker button */}
        <button
          onClick={() => setShowTagMenu((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-muted)] text-xs text-[var(--color-foreground)] transition-colors"
          title="Choose tag"
        >
          <span
            className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
            style={{background: previewBg}}
          />
          <ChevronDown size={10} className="text-[var(--color-muted-foreground)]" />
        </button>

        <div className="w-px h-5 bg-[var(--color-border)] mx-0.5" />

        {/* Highlight */}
        <button
          onClick={() => doHighlight()}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-muted)] text-xs font-medium text-[var(--color-foreground)] transition-colors"
          title="Highlight (Enter)"
        >
          Highlight
        </button>

        {selectedTagId && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              doHighlight('');
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-muted)] text-xs font-medium text-[var(--color-foreground)] transition-colors"
            title="Tag & Highlight (Shift+Enter)"
          >
            <span
              className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
              style={{background: previewBorder}}
            />
            Tag &amp; Highlight
          </button>
        )}

        {/* Note */}
        <button
          onClick={() => setShowNoteInput((v) => !v)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-muted)] text-xs text-[var(--color-foreground)] transition-colors"
          title="Add note"
        >
          Note
        </button>

        {topicId && (
          <>
            <div className="w-px h-5 bg-[var(--color-border)] mx-0.5" />
            <button
              onClick={handleCapture}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-muted)] text-xs text-[var(--color-foreground)] transition-colors"
              title="Quick capture"
            >
              <Zap size={11} />
            </button>
            <button
              onClick={handleAddNode}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-muted)] text-xs text-[var(--color-foreground)] transition-colors"
              title="Add as map node"
            >
              <MapPin size={11} />
            </button>
            <button
              onClick={handleConnect}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[var(--color-muted)] text-xs text-[var(--color-foreground)] transition-colors"
              title="Connect to existing node"
            >
              <Link2 size={11} />
            </button>
          </>
        )}
      </div>

      {/* Tag dropdown */}
      {showTagMenu && (
        <div className="border-t border-[var(--color-border)] px-2 py-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => {
                setSelectedTagId(selectedTagId === tag.id ? null : tag.id);
                setShowTagMenu(false);
              }}
              className={[
                'flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors',
                selectedTagId === tag.id
                  ? 'border-transparent text-[var(--color-foreground)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              ].join(' ')}
              style={
                selectedTagId === tag.id
                  ? {background: tag.color + '40', borderColor: tag.color}
                  : {}
              }
            >
              <span className="w-2 h-2 rounded-full" style={{background: tag.color}} />
              {tag.name}
            </button>
          ))}
          {tags.length === 0 && (
            <span className="text-xs text-[var(--color-muted-foreground)]">No tags yet</span>
          )}
        </div>
      )}

      {/* Note input */}
      {showNoteInput && (
        <div className="border-t border-[var(--color-border)] px-2 py-2 flex gap-2">
          <input
            ref={noteInputRef}
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                doHighlight(noteText);
              }
              if (e.key === 'Escape') {
                e.stopPropagation();
                setShowNoteInput(false);
                setNoteText('');
              }
            }}
            placeholder="Add a note… (Enter to save)"
            className="flex-1 text-xs bg-[var(--color-muted)] rounded px-2 py-1.5 outline-none text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
          />
        </div>
      )}

      {/* Node picker for Connect-to-Node */}
      {showNodePicker && topicId && (
        <div className="border-t border-[var(--color-border)] p-2">
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
