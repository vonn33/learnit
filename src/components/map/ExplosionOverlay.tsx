import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useMapStore } from '@/store/mapStore';
import { useAnnotationStore } from '@/store/annotationStore';

interface ExplosionOverlayProps {
  nodeId: string;
  topicId: string;
  onClose: () => void;
  onAnnotationJump: (nodeId: string) => void;
  onChildClick?: (nodeId: string) => void;
}

// Pure helper — exported for testing
export function radialPositions(
  center: { x: number; y: number },
  radius: number,
  count: number,
): Array<{ x: number; y: number }> {
  if (count === 0) return [];
  const startAngleDeg = count === 2 ? 225 : 270;
  const stepDeg = count === 2 ? 90 : 360 / count;
  return Array.from({ length: count }, (_, i) => {
    const angleDeg = startAngleDeg + i * stepDeg;
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: Math.round(center.x + radius * Math.cos(angleRad)) || 0,
      y: Math.round(center.y + radius * Math.sin(angleRad)) || 0,
    };
  });
}

export function ExplosionOverlay({
  nodeId,
  topicId,
  onClose,
  onAnnotationJump,
  onChildClick,
}: ExplosionOverlayProps) {
  const { flowToScreenPosition } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const topicMap = useMapStore((s) => s.maps[topicId]);
  const node = topicMap?.nodes.find((n) => n.id === nodeId);

  const annotations = useAnnotationStore((s) => s.annotations);
  const annotation = node?.annotationId
    ? annotations.find((a) => a.id === node.annotationId)
    : undefined;

  const childIds = new Set(
    (topicMap?.edges ?? []).filter((e) => e.source === nodeId).map((e) => e.target),
  );
  const children = (topicMap?.nodes ?? []).filter((n) => childIds.has(n.id) && n.position);

  // Focus dialog on mount for keyboard accessibility
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Dismiss on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!node?.position) return null;

  // Convert flow positions to canvas-relative pixel positions
  function toCanvasPos(flowPos: { x: number; y: number }) {
    const screen = flowToScreenPosition(flowPos);
    const rect = containerRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
    return { x: screen.x - rect.left, y: screen.y - rect.top };
  }

  const centerPos = toCanvasPos(node.position);
  const RADIUS = 130;
  const childPositions = radialPositions(centerPos, RADIUS, children.length);

  const excerptText = annotation?.note ?? annotation?.text;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-40"
      style={{ pointerEvents: 'none' }}
    >
      {/* Invisible focus target for a11y */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Node details: ${node.label}`}
        tabIndex={-1}
        className="sr-only"
      />
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/45"
        style={{ pointerEvents: 'auto' }}
        onClick={onClose}
      />

      {/* SVG connector lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 41 }}>
        {children.map((child, i) => (
          <line
            key={child.id}
            x1={centerPos.x}
            y1={centerPos.y}
            x2={childPositions[i].x}
            y2={childPositions[i].y}
            stroke="rgba(99,102,241,0.25)"
            strokeWidth={1.5}
            strokeDasharray="4,3"
          />
        ))}
      </svg>

      {/* Center node chip */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-[#1e1b4b] border-2 border-indigo-500 rounded-lg text-sm font-semibold text-slate-200 shadow-[0_0_20px_rgba(99,102,241,0.5)] whitespace-nowrap"
        style={{ left: centerPos.x, top: centerPos.y, zIndex: 43, pointerEvents: 'auto' }}
      >
        {node.label}
      </div>

      {/* Annotation excerpt — below center node */}
      {excerptText && (
        <div
          className="absolute -translate-x-1/2 w-48 bg-[#111827] border border-indigo-500/20 rounded-md p-2 text-center"
          style={{ left: centerPos.x, top: centerPos.y + 36, zIndex: 43, pointerEvents: 'auto' }}
        >
          <p className="text-[10px] text-slate-400 italic leading-relaxed mb-1 line-clamp-3">
            "{excerptText}"
          </p>
          <button
            className="text-[10px] text-indigo-400 hover:text-indigo-300"
            onClick={() => onAnnotationJump(nodeId)}
          >
            Jump to annotation ↗
          </button>
        </div>
      )}

      {/* Empty state */}
      {!annotation && children.length === 0 && (
        <div
          className="absolute -translate-x-1/2 w-40 bg-[#111827] border border-indigo-500/10 rounded-md p-2 text-center"
          style={{ left: centerPos.x, top: centerPos.y + 36, zIndex: 43, pointerEvents: 'auto' }}
        >
          <p className="text-[10px] text-slate-500 italic">no notes yet</p>
        </div>
      )}

      {/* Child node chips */}
      {children.map((child, i) => (
        <button
          key={child.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#0f172a] border border-indigo-500/70 rounded-md text-[11px] text-indigo-300 hover:border-indigo-400 hover:text-indigo-200 transition-colors"
          style={{ left: childPositions[i].x, top: childPositions[i].y, zIndex: 43, pointerEvents: 'auto' }}
          onClick={() => onChildClick ? onChildClick(child.id) : onAnnotationJump(child.id)}
        >
          {child.label}
        </button>
      ))}

      {/* Dismiss hint */}
      <div
        className="absolute bottom-2 right-3 text-[10px] text-slate-600"
        style={{ zIndex: 43, pointerEvents: 'none' }}
      >
        click outside or Esc to close
      </div>
    </div>
  );
}
