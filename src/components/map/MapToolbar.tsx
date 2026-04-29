import { Grid3x3, Move, Trash2 } from 'lucide-react';

interface MapToolbarProps {
  snapToGrid: boolean;
  onToggleSnap: () => void;
  onClearMap?: () => void;
}

export function MapToolbar({ snapToGrid, onToggleSnap, onClearMap }: MapToolbarProps) {
  return (
    <div className="absolute top-2 right-2 z-10 flex gap-1">
      <button
        onClick={onToggleSnap}
        className={`p-1.5 rounded text-xs border ${
          snapToGrid
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-card border-border text-foreground/50 hover:text-foreground'
        }`}
        title={snapToGrid ? 'Free placement' : 'Snap to grid'}
      >
        {snapToGrid ? <Grid3x3 size={14} /> : <Move size={14} />}
      </button>
      {onClearMap && (
        <button
          onClick={onClearMap}
          className="p-1.5 rounded text-xs border bg-card border-border text-foreground/50 hover:text-destructive hover:border-destructive/30"
          title="Clear map"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
