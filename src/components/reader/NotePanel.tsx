import {useEffect, useRef, useState} from 'react';
import {type Tag} from '@/store/tagStore';
import {hexToRgba} from '@/lib/highlights';
import {X, Check, Trash2, Unlink} from 'lucide-react';
import {useAnnotationStore} from '@/store/annotationStore';
import {useMapStore} from '@/store/mapStore';
import {NodePicker} from '@/components/map/NodePicker';

interface NotePanelProps {
  annotationId: string;
  topicId?: string;
  anchorRect: DOMRect | null;
  tags: Tag[];
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function NotePanel({annotationId, topicId, anchorRect: _anchorRect, tags, onClose, onDelete}: NotePanelProps) {
  const annotation = useAnnotationStore((s) => s.annotations.find((a) => a.id === annotationId) ?? null);
  const updateAnnotation = useAnnotationStore((s) => s.updateAnnotation);
  const removeAnnotation = useAnnotationStore((s) => s.removeAnnotation);

  const [note, setNote] = useState(annotation?.note ?? '');
  const [connectionUrl, setConnectionUrl] = useState(annotation?.connectionUrl ?? '');
  const [savedAt, setSavedAt] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [mapNodeId, setMapNodeId] = useState<string | null>(annotation?.mapNodeId ?? null);

  useEffect(() => {
    setNote(annotation?.note ?? '');
    setConnectionUrl(annotation?.connectionUrl ?? '');
    setDeleteConfirm(false);
    setMapNodeId(annotation?.mapNodeId ?? null);
  }, [annotationId, annotation?.note, annotation?.connectionUrl, annotation?.mapNodeId]);

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

  async function save() {
    await updateAnnotation(annotationId, {note, connectionUrl});
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(0), 1800);
  }

  async function handleConnect(nodeId: string) {
    if (!topicId) return;
    await useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId});
    useMapStore.getState().updateNode(topicId, nodeId, {annotationId});
    setMapNodeId(nodeId);
    setShowNodePicker(false);
  }

  async function handleDisconnect() {
    if (!topicId || !mapNodeId) return;
    await useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: undefined});
    useMapStore.getState().updateNode(topicId, mapNodeId, {annotationId: undefined});
    setMapNodeId(null);
  }

  async function handleDeleteClick() {
    if (deleteConfirm) {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      await removeAnnotation(annotationId);
      onDelete(annotationId);
    } else {
      setDeleteConfirm(true);
      deleteTimerRef.current = setTimeout(() => setDeleteConfirm(false), 3000);
    }
  }

  const connectedNodeLabel = useMapStore(
    (s) => (mapNodeId && topicId ? (s.maps[topicId]?.nodes.find((n) => n.id === mapNodeId)?.label ?? null) : null),
  );

  if (!annotation) return null;

  const appliedTags = tags.filter((t) => annotation.tagIds.includes(t.id));
  const primaryTagColor = appliedTags[0]?.color;

  const dateStr = new Date(annotation.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      data-note-panel="true"
      className="fixed right-4 top-16 z-50 w-80 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card)] shadow-[0_8px_40px_rgba(0,0,0,0.28),0_2px_8px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden"
      style={{
        boxShadow: '0 8px 40px rgba(0,0,0,0.26), 0 2px 8px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,220,180,0.08)',
      }}
    >
      {/* Top accent */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{background: 'linear-gradient(90deg, transparent, color-mix(in oklch, var(--color-primary) 60%, transparent) 50%, transparent)'}}
      />
      {primaryTagColor && (
        <span
          aria-hidden
          className="absolute left-0 top-6 bottom-6 w-[3px] rounded-r"
          style={{background: primaryTagColor}}
        />
      )}

      {/* Header: tags + close */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {appliedTags.length > 0 ? (
            appliedTags.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 smallcaps text-[10px] tracking-[0.1em] px-2 py-0.5 rounded-full"
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
        <button
          onClick={onClose}
          className="p-1 rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors shrink-0 ml-2"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Quote */}
      <blockquote
        className="font-prose italic text-[13.5px] leading-[1.6] text-[var(--color-foreground)] mx-4 mb-3 pl-3 border-l-2"
        style={{
          fontVariationSettings: '"opsz" 16, "wght" 400',
          borderColor: primaryTagColor ? primaryTagColor + 'aa' : 'var(--color-primary)',
        }}
      >
        {annotation.text.length > 220
          ? annotation.text.slice(0, 220) + '…'
          : annotation.text}
      </blockquote>

      <div className="px-4 pb-0 flex flex-col gap-3">
        {/* Note textarea */}
        <div>
          <label className="block smallcaps text-[10px] tracking-[0.14em] text-[var(--color-muted-foreground)] mb-1.5">
            Marginal Note
          </label>
          <textarea
            ref={textareaRef}
            className="w-full font-prose text-[13px] bg-[var(--color-vellum)] border border-[var(--color-border)] rounded-lg px-3 py-2 resize-none outline-none focus:ring-1 ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]/40 text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] placeholder:italic transition-colors"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onBlur={save}
            placeholder="Add an insight or connection…"
            rows={3}
            style={{fontVariationSettings: '"opsz" 17'}}
          />
          {savedAt > 0 && (
            <span className="flex items-center gap-1 smallcaps text-[10px] tracking-[0.08em] text-[var(--color-primary)] mt-1 opacity-80">
              <Check size={10} /> Saved
            </span>
          )}
        </div>

        {/* Map Node Connection */}
        {topicId && (
          <div>
            <label className="block smallcaps text-[10px] tracking-[0.14em] text-[var(--color-muted-foreground)] mb-1.5">
              Map Node
            </label>
            {mapNodeId && connectedNodeLabel ? (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[12px] font-prose text-[var(--color-foreground)] bg-[var(--color-vellum)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 truncate">
                  {connectedNodeLabel}
                </span>
                <button
                  onClick={handleDisconnect}
                  className="p-1.5 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-accent)] transition-colors shrink-0"
                  aria-label="Disconnect node"
                >
                  <Unlink size={13} />
                </button>
              </div>
            ) : showNodePicker ? (
              <NodePicker
                topicId={topicId}
                onSelect={handleConnect}
                onClose={() => setShowNodePicker(false)}
              />
            ) : (
              <button
                onClick={() => setShowNodePicker(true)}
                className="w-full text-left smallcaps text-[11px] tracking-[0.08em] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] bg-[var(--color-vellum)] border border-dashed border-[var(--color-rule)] rounded-lg px-3 py-2 transition-colors"
              >
                Connect to map node →
              </button>
            )}
          </div>
        )}

        {/* Link */}
        <div>
          <label className="block smallcaps text-[10px] tracking-[0.14em] text-[var(--color-muted-foreground)] mb-1.5">
            Link (optional)
          </label>
          <input
            type="text"
            className="w-full text-[12px] bg-[var(--color-vellum)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 outline-none focus:ring-1 ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]/40 text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] transition-colors font-mono"
            value={connectionUrl}
            onChange={(e) => setConnectionUrl(e.target.value)}
            onBlur={save}
            placeholder="/docs/... or https://..."
            style={{fontVariationSettings: '"MONO" 1'}}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 mt-2 border-t border-[var(--color-rule)] bg-[var(--color-background)]/40">
        <span
          className="font-mono text-[10px] text-[var(--color-muted-foreground)] opacity-60"
          style={{fontVariationSettings: '"MONO" 1'}}
        >
          {dateStr}
        </span>
        <button
          onClick={handleDeleteClick}
          className={[
            'flex items-center gap-1.5 smallcaps text-[10px] tracking-[0.08em] px-2.5 py-1.5 rounded-md transition-colors',
            deleteConfirm
              ? 'bg-[var(--color-destructive)]/15 text-[var(--color-destructive)] border border-[var(--color-destructive)]/30'
              : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] border border-transparent hover:border-[var(--color-destructive)]/25',
          ].join(' ')}
        >
          <Trash2 size={11} />
          {deleteConfirm ? 'Confirm?' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
