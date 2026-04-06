import { useState, useMemo } from 'react';
import { useMapStore } from '@/store/mapStore';

interface NodePickerProps {
  topicId: string;
  onSelect: (nodeId: string) => void;
  onClose: () => void;
}

export function NodePicker({ topicId, onSelect, onClose }: NodePickerProps) {
  const [query, setQuery] = useState('');
  const map = useMapStore((s) => s.maps[topicId]);

  const filtered = useMemo(() => {
    if (!map) return [];
    const nodes = map.nodes.filter((n) => n.status === 'placed');
    if (!query) return nodes;
    const lower = query.toLowerCase();
    return nodes.filter((n) => n.label.toLowerCase().includes(lower));
  }, [map, query]);

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-2 w-56">
      <input
        type="text"
        placeholder="Search nodes..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-2 py-1 text-sm bg-background border border-border rounded mb-1"
        autoFocus
      />
      <div className="max-h-32 overflow-y-auto space-y-0.5">
        {filtered.map((node) => (
          <button
            key={node.id}
            onClick={() => onSelect(node.id)}
            className="w-full text-left px-2 py-1 text-sm rounded hover:bg-muted truncate"
          >
            {node.label}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-foreground/40 px-2 py-1">No nodes found</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="mt-1 text-xs text-foreground/40 hover:text-foreground px-2"
      >
        Cancel
      </button>
    </div>
  );
}
