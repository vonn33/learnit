import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useAnnotationStore} from '@/store/annotationStore';
import {clampToViewport} from '@/lib/positioning';
import {useClickOutside} from '@/lib/useClickOutside';

interface NoteTooltipProps {
  annotationId: string;
  anchorRect: DOMRect;
  onClose: () => void;
  onEdit: () => void;
}

export function NoteTooltip({annotationId, anchorRect, onClose, onEdit}: NoteTooltipProps) {
  const annotation = useAnnotationStore((s) => s.annotations.find((a) => a.id === annotationId));
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({top: -9999, left: -9999});

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

  useClickOutside(tooltipRef, onClose, {deferArm: true});

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!annotation?.note) return null;

  return (
    <div
      ref={tooltipRef}
      data-note-panel
      role="dialog"
      aria-label="Note"
      className="fixed z-50 w-60 rounded-xl border bg-[var(--color-card)] shadow-xl p-3 flex flex-col gap-2"
      style={{top: pos.top, left: pos.left}}
    >
      <p className="text-sm text-[var(--color-foreground)] leading-relaxed">{annotation.note}</p>
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
