import { useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react';
import { useMapStore } from '@/store/mapStore';

interface StagingInboxProps {
  topicId: string;
}

export function StagingInbox({ topicId }: StagingInboxProps) {
  const [expanded, setExpanded] = useState(true);
  const topicMap = useMapStore((s) => s.maps[topicId]);
  const stagedNodes = useMemo(
    () => (topicMap?.nodes ?? []).filter((n) => n.status === 'staged'),
    [topicMap],
  );
  const updateNode = useMapStore((s) => s.updateNode);
  const removeNode = useMapStore((s) => s.removeNode);

  const handlePromote = useCallback(
    (nodeId: string) => {
      // Place at a default position — user can drag to reposition
      updateNode(topicId, nodeId, {
        status: 'placed',
        position: { x: 200, y: 200 },
      });
    },
    [topicId, updateNode],
  );

  const handleDismiss = useCallback(
    (nodeId: string) => {
      removeNode(topicId, nodeId);
    },
    [topicId, removeNode],
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent, nodeId: string) => {
      event.dataTransfer.setData('nodeId', nodeId);
      event.dataTransfer.effectAllowed = 'move';

      // Create off-screen ghost element for drag image
      const ghost = document.createElement('div');
      ghost.style.cssText =
        'position:fixed;top:-200px;left:-200px;padding:4px 10px;background:#1e1b4b;border:1px solid #6366f1;border-radius:6px;font-size:12px;color:#e2e8f0;white-space:nowrap';
      const label = stagedNodes.find((n) => n.id === nodeId)?.label ?? '';
      ghost.textContent = label;
      document.body.appendChild(ghost);
      event.dataTransfer.setDragImage(ghost, 0, 0);
      setTimeout(() => document.body.removeChild(ghost), 0);
    },
    [stagedNodes],
  );

  if (stagedNodes.length === 0) return null;

  return (
    <div className="absolute bottom-2 left-2 right-2 bg-card border border-border rounded-lg shadow-lg z-10 max-h-[40%]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground"
      >
        <span>Inbox ({stagedNodes.length})</span>
        {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {expanded && (
        <div className="px-2 pb-2 space-y-1 overflow-y-auto max-h-[200px]">
          {stagedNodes.map((node) => (
            <div
              key={node.id}
              draggable
              onDragStart={(e) => handleDragStart(e, node.id)}
              className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/50 text-sm group cursor-grab active:cursor-grabbing"
            >
              <GripVertical size={12} className="text-foreground/30 shrink-0" />
              <span className="truncate flex-1">{node.label}</span>
              <button
                onClick={() => handlePromote(node.id)}
                className="text-xs text-primary/60 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                title="Place on map"
              >
                Place
              </button>
              <button
                onClick={() => handleDismiss(node.id)}
                className="text-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                title="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
