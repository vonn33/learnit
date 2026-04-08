import { useEffect, useRef, useState } from 'react';
import { useMapStore, type MapEdge } from '@/store/mapStore';

interface EdgePopoverProps {
  edgeId: string;
  topicId: string;
  position: { x: number; y: number };
  onClose: () => void;
}

const TYPE_COLORS: Record<NonNullable<MapEdge['relationshipType']>, { text: string; border: string; bg: string }> = {
  causes:      { text: '#f97316', border: '#f97316', bg: '#431407' },
  supports:    { text: '#22c55e', border: '#22c55e', bg: '#052e16' },
  contradicts: { text: '#ef4444', border: '#ef4444', bg: '#450a0a' },
  'is-a':      { text: '#a78bfa', border: '#a78bfa', bg: '#2e1065' },
};

const TYPES = ['causes', 'supports', 'contradicts', 'is-a'] as const;

export function EdgePopover({ edgeId, topicId, position, onClose }: EdgePopoverProps) {
  const edge = useMapStore((s) => s.maps[topicId]?.edges.find((e) => e.id === edgeId));
  const updateEdge = useMapStore((s) => s.updateEdge);
  const removeEdge = useMapStore((s) => s.removeEdge);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [noteValue, setNoteValue] = useState(edge?.note ?? '');

  // Clamp to viewport so popover never renders off-screen
  const POPOVER_W = 232;
  const POPOVER_H = 190;
  const left = Math.min(position.x, window.innerWidth - POPOVER_W - 8);
  const top = Math.min(position.y + 8, window.innerHeight - POPOVER_H - 8);

  // Dismiss on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Dismiss on click-outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!edge) return null;

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-[232px] bg-[#1e293b] border border-[#334155] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] p-3"
      style={{ left, top }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2.5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wide">Connection</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm leading-none">×</button>
      </div>

      {/* Type picker */}
      <div className="mb-2.5">
        <div className="text-[10px] text-slate-500 mb-1.5">TYPE</div>
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((type) => {
            const isActive = edge.relationshipType === type;
            const colors = TYPE_COLORS[type];
            return (
              <button
                key={type}
                onClick={() => updateEdge(topicId, edgeId, { relationshipType: isActive ? undefined : type })}
                className="px-2.5 py-0.5 rounded-full text-[10px] border transition-colors"
                style={isActive ? {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.bg,
                } : {
                  color: '#475569',
                  borderColor: '#334155',
                  backgroundColor: 'transparent',
                }}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Note */}
      <div className="mb-2.5">
        <div className="text-[10px] text-slate-500 mb-1.5">NOTE</div>
        <textarea
          className="w-full bg-[#0f172a] border border-[#334155] rounded-md p-1.5 text-[11px] text-slate-300 placeholder:text-slate-600 resize-none focus:outline-none focus:border-slate-500"
          rows={3}
          placeholder="Add a note..."
          value={noteValue}
          onChange={(e) => setNoteValue(e.target.value)}
          onBlur={() => updateEdge(topicId, edgeId, { note: noteValue || undefined })}
        />
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => { removeEdge(topicId, edgeId); onClose(); }}
          className="text-[10px] text-red-500/70 hover:text-red-400"
        >
          Delete edge
        </button>
        <span className="text-[10px] text-slate-600">Esc to close</span>
      </div>
    </div>
  );
}
