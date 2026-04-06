import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {getHighlights} from '@/lib/storage';
import {clampToViewport} from '@/lib/positioning';
import {useDelayedUnmount} from '@/lib/useDelayedUnmount';

interface NoteTooltipProps {
  highlightId: string;
  anchorRect: DOMRect;
  onClose: () => void;
  onEdit: () => void;
}

export function NoteTooltip({highlightId, anchorRect, onClose, onEdit}: NoteTooltipProps) {
  const highlight = getHighlights().find((h) => h.id === highlightId);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({top: -9999, left: -9999});
  const [visible] = useState(true);
  const shouldRender = useDelayedUnmount(visible, 100);

  useLayoutEffect(() => {
    if (!tooltipRef.current) return;
    const {offsetWidth, offsetHeight} = tooltipRef.current;
    const result = clampToViewport({
      anchorRect,
      popoverWidth: offsetWidth,
      popoverHeight: offsetHeight,
      preferredPlacement: 'above',
      margin: 8,
    });
    setPos({top: result.top, left: result.left});
  }, [anchorRect]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    setTimeout(() => document.addEventListener('mousedown', onDocClick), 0);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [onClose]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!highlight?.note || !shouldRender) return null;

  return (
    <div
      ref={tooltipRef}
      data-note-panel
      role="dialog"
      aria-label="Note"
      className="fixed z-50 w-60 rounded-xl border bg-[var(--color-card)] shadow-xl p-3 flex flex-col gap-2"
      style={{top: pos.top, left: pos.left}}
    >
      <p className="text-sm text-[var(--color-foreground)] leading-relaxed">{highlight.note}</p>
      <div className="flex justify-end border-t border-[var(--color-border)] pt-2">
        <button
          onClick={onEdit}
          className="text-xs text-[var(--color-primary)] hover:opacity-80 transition-opacity"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
