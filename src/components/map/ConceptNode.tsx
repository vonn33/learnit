import { Handle, Position, type NodeProps } from '@xyflow/react';

interface ConceptNodeData {
  label: string;
  nodeType: 'structural' | 'concept' | 'super-node';
  hasAnnotation?: boolean;
  confidence?: string;
}

export function confidenceClass(confidence?: string): string {
  if (confidence === 'uncertain') return 'border-red-500/70 shadow-red-500/20 shadow-sm';
  if (confidence === 'familiar') return 'border-amber-500/70 shadow-amber-500/20 shadow-sm';
  if (confidence === 'mastered') return 'border-green-500/70 shadow-green-500/20 shadow-sm';
  return '';
}

export function ConceptNode({ data }: NodeProps) {
  const d = data as unknown as ConceptNodeData;
  const isStructural = d.nodeType === 'structural';
  const isSuperNode = d.nodeType === 'super-node';

  return (
    <div
      className={`
        relative px-3 py-2 rounded-lg border text-sm max-w-[200px] truncate
        ${isStructural ? 'bg-muted/50 border-border text-foreground/60' : ''}
        ${isSuperNode ? 'bg-card border-primary/40 text-foreground border-dashed' : ''}
        ${!isStructural && !isSuperNode ? 'bg-card border-primary/20 text-foreground shadow-sm' : ''}
        ${d.hasAnnotation ? 'ring-1 ring-primary/30' : ''}
        ${confidenceClass(d.confidence)}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary/40 !w-2 !h-2" />
      {isSuperNode && (
        <span className="absolute top-0.5 right-1 text-[10px] text-primary/50 leading-none pointer-events-none">
          ↗
        </span>
      )}
      <span>{d.label}</span>
      <Handle type="source" position={Position.Bottom} className="!bg-primary/40 !w-2 !h-2" />
    </div>
  );
}
