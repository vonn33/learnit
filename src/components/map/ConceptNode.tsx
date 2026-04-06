import { Handle, Position, type NodeProps } from '@xyflow/react';

interface ConceptNodeData {
  label: string;
  nodeType: 'structural' | 'concept' | 'super-node';
  hasAnnotation?: boolean;
}

export function ConceptNode({ data }: NodeProps) {
  const d = data as unknown as ConceptNodeData;
  const isStructural = d.nodeType === 'structural';
  const isSuperNode = d.nodeType === 'super-node';

  return (
    <div
      className={`
        px-3 py-2 rounded-lg border text-sm max-w-[200px] truncate
        ${isStructural ? 'bg-muted/50 border-border text-foreground/60' : ''}
        ${isSuperNode ? 'bg-card border-primary/40 text-foreground border-dashed' : ''}
        ${!isStructural && !isSuperNode ? 'bg-card border-primary/20 text-foreground shadow-sm' : ''}
        ${d.hasAnnotation ? 'ring-1 ring-primary/30' : ''}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary/40 !w-2 !h-2" />
      <span>{d.label}</span>
      <Handle type="source" position={Position.Bottom} className="!bg-primary/40 !w-2 !h-2" />
    </div>
  );
}
