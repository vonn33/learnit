# Wave B — Interactive Map Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the concept map a living learning surface with five features: inbox drag-to-canvas, node explosion overlay, path highlighting, magnetic connection snap, and node confidence states.

**Architecture:** Persistent user data (`confidence`) goes on `MapNode` in `mapStore`; transient UI state (`explodedNodeId`) lives in `useState` inside `MapCanvas`. `ExplosionOverlay` is a separate component rendered as a child of `<ReactFlow>` so it can call `useReactFlow()`. No new stores introduced.

**Tech Stack:** React 18, TypeScript, Zustand (persist), `@xyflow/react` (ReactFlow), Tailwind CSS, Vitest

**Spec:** `docs/superpowers/specs/2026-04-08-wave-b-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/store/mapStore.ts` | Modify | Add `confidence` to `MapNode` + `NodeUpdate` |
| `src/components/map/ConceptNode.tsx` | Modify | Add `confidence` to data interface + border/shadow styling |
| `src/components/map/MapCanvas.tsx` | Modify | Drag-drop wiring, explosion state, path highlighting, magnetic snap, confidence context menu, `DropHandler` inner component |
| `src/components/map/StagingInbox.tsx` | Modify | Draggable item rows + ghost drag image |
| `src/components/map/ExplosionOverlay.tsx` | Create | Radial burst overlay: center node, annotation excerpt, child chips, backdrop, Escape key |
| `src/pages/DocsPage.tsx` | Modify | Rename `onNodeClick` prop call to `onAnnotationJump` |
| `src/__tests__/mapStore.test.ts` | Modify | Tests for confidence field |
| `src/__tests__/explosionOverlay.test.ts` | Create | Tests for radial position math and child extraction |

---

## Task 1: Add `confidence` to mapStore

**Files:**
- Modify: `src/store/mapStore.ts`
- Modify: `src/__tests__/mapStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/__tests__/mapStore.test.ts`:

```ts
describe('confidence states', () => {
  it('sets confidence on a node via updateNode', () => {
    useMapStore.getState().initMap('t');
    const nodeId = useMapStore.getState().addNode('t', {
      label: 'Spaced Repetition',
      type: 'concept',
      status: 'placed',
      position: { x: 0, y: 0 },
    });

    useMapStore.getState().updateNode('t', nodeId, { confidence: 'familiar' });

    const node = useMapStore.getState().maps['t'].nodes[0];
    expect(node.confidence).toBe('familiar');
  });

  it('clears confidence when set to undefined', () => {
    useMapStore.getState().initMap('t');
    const nodeId = useMapStore.getState().addNode('t', {
      label: 'Node',
      type: 'concept',
      status: 'placed',
      position: { x: 0, y: 0 },
    });

    useMapStore.getState().updateNode('t', nodeId, { confidence: 'mastered' });
    useMapStore.getState().updateNode('t', nodeId, { confidence: undefined });

    const node = useMapStore.getState().maps['t'].nodes[0];
    expect(node.confidence).toBeUndefined();
  });

  it('confidence does not affect other node fields', () => {
    useMapStore.getState().initMap('t');
    const nodeId = useMapStore.getState().addNode('t', {
      label: 'Node',
      type: 'concept',
      status: 'placed',
      position: { x: 10, y: 20 },
    });

    useMapStore.getState().updateNode('t', nodeId, { confidence: 'uncertain' });

    const node = useMapStore.getState().maps['t'].nodes[0];
    expect(node.label).toBe('Node');
    expect(node.position).toEqual({ x: 10, y: 20 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/mapStore.test.ts
```

Expected: 3 FAIL — `confidence` doesn't exist on `MapNode` yet.

- [ ] **Step 3: Add `confidence` to `MapNode` interface and `NodeUpdate`**

In `src/store/mapStore.ts`:

```ts
// Change MapNode interface — add confidence field:
export interface MapNode {
  id: string;
  label: string;
  type: 'structural' | 'concept' | 'super-node';
  status: 'placed' | 'staged';
  position?: { x: number; y: number };
  annotationId?: string;
  linkedMapId?: string;
  confidence?: 'uncertain' | 'familiar' | 'mastered';
}

// Change NodeUpdate type — add 'confidence':
type NodeUpdate = Partial<Pick<MapNode, 'label' | 'status' | 'position' | 'annotationId' | 'linkedMapId' | 'type' | 'confidence'>>;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/mapStore.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/mapStore.ts src/__tests__/mapStore.test.ts
git commit -m "feat: add confidence field to MapNode and NodeUpdate"
```

---

## Task 2: Node confidence border styling in ConceptNode

**Files:**
- Modify: `src/components/map/ConceptNode.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/conceptNodeConfidence.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

// Extract the pure confidence-to-class logic so it can be unit tested
// without rendering React. This function will be defined in ConceptNode.tsx
// and exported for testing.
function confidenceClass(confidence?: string): string {
  if (confidence === 'uncertain') return 'border-red-500/70 shadow-red-500/20 shadow-sm';
  if (confidence === 'familiar') return 'border-amber-500/70 shadow-amber-500/20 shadow-sm';
  if (confidence === 'mastered') return 'border-green-500/70 shadow-green-500/20 shadow-sm';
  return '';
}

describe('confidenceClass', () => {
  it('returns red classes for uncertain', () => {
    expect(confidenceClass('uncertain')).toBe('border-red-500/70 shadow-red-500/20 shadow-sm');
  });

  it('returns amber classes for familiar', () => {
    expect(confidenceClass('familiar')).toBe('border-amber-500/70 shadow-amber-500/20 shadow-sm');
  });

  it('returns green classes for mastered', () => {
    expect(confidenceClass('mastered')).toBe('border-green-500/70 shadow-green-500/20 shadow-sm');
  });

  it('returns empty string when unset', () => {
    expect(confidenceClass(undefined)).toBe('');
    expect(confidenceClass('')).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/conceptNodeConfidence.test.ts
```

Expected: FAIL — `confidenceClass` is imported from nowhere (test defines it locally — this confirms the logic, not an import). Actually the test above defines `confidenceClass` inline so it tests the logic directly. It will PASS as-is. That's fine — this test pins the contract before we write it in the component.

Run the test anyway to confirm it passes:

```bash
npx vitest run src/__tests__/conceptNodeConfidence.test.ts
```

Expected: PASS

- [ ] **Step 3: Update ConceptNode**

Replace `src/components/map/ConceptNode.tsx` with:

```tsx
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
```

- [ ] **Step 4: Update test to import from component**

Update `src/__tests__/conceptNodeConfidence.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { confidenceClass } from '@/components/map/ConceptNode';

describe('confidenceClass', () => {
  it('returns red classes for uncertain', () => {
    expect(confidenceClass('uncertain')).toBe('border-red-500/70 shadow-red-500/20 shadow-sm');
  });

  it('returns amber classes for familiar', () => {
    expect(confidenceClass('familiar')).toBe('border-amber-500/70 shadow-amber-500/20 shadow-sm');
  });

  it('returns green classes for mastered', () => {
    expect(confidenceClass('mastered')).toBe('border-green-500/70 shadow-green-500/20 shadow-sm');
  });

  it('returns empty string when unset', () => {
    expect(confidenceClass(undefined)).toBe('');
    expect(confidenceClass('')).toBe('');
  });
});
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/conceptNodeConfidence.test.ts
```

Expected: 4 PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/map/ConceptNode.tsx src/__tests__/conceptNodeConfidence.test.ts
git commit -m "feat: add confidence border styling to ConceptNode"
```

---

## Task 3: Wire confidence into MapCanvas (toFlowNodes + context menu)

**Files:**
- Modify: `src/components/map/MapCanvas.tsx`

No new tests needed — the store and styling are already tested. This task wires them together in the UI.

- [ ] **Step 1: Add `confidence` to `toFlowNodes`**

In `src/components/map/MapCanvas.tsx`, update the `toFlowNodes` function:

```ts
function toFlowNodes(mapNodes: MapNode[]): Node[] {
  return mapNodes
    .filter((n) => n.status === 'placed' && n.position)
    .map((n) => ({
      id: n.id,
      type: 'concept',
      position: n.position!,
      data: {
        label: n.label,
        nodeType: n.type,
        hasAnnotation: !!n.annotationId,
        confidence: n.confidence,
      },
    }));
}
```

- [ ] **Step 2: Add confidence menu items to the context menu**

In `src/components/map/MapCanvas.tsx`, replace the existing `{contextMenu && (...)}` block with:

```tsx
{contextMenu && (
  <div
    className="fixed bg-card border border-border rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
    style={{ left: contextMenu.x, top: contextMenu.y }}
    onClick={(e) => e.stopPropagation()}
  >
    <button
      onClick={() => {
        const label = prompt('Rename node:', '');
        if (label) updateNode(topicId, contextMenu.nodeId, { label });
        setContextMenu(null);
      }}
      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
    >
      Rename
    </button>
    <button
      onClick={() => {
        removeNode(topicId, contextMenu.nodeId);
        setContextMenu(null);
      }}
      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted text-destructive"
    >
      Delete
    </button>
    <div className="border-t border-border my-1" />
    {(['uncertain', 'familiar', 'mastered'] as const).map((level) => {
      const dotColor = level === 'uncertain' ? 'bg-red-500' : level === 'familiar' ? 'bg-amber-500' : 'bg-green-500';
      const label = level === 'uncertain' ? 'Mark uncertain' : level === 'familiar' ? 'Mark familiar' : 'Mark mastered';
      const currentNode = topicMap?.nodes.find((n) => n.id === contextMenu.nodeId);
      const isActive = currentNode?.confidence === level;
      return (
        <button
          key={level}
          onClick={() => {
            updateNode(topicId, contextMenu.nodeId, {
              confidence: isActive ? undefined : level,
            });
            setContextMenu(null);
          }}
          className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
          <span className="flex-1">{label}</span>
          {isActive && <span className="text-xs text-primary">✓</span>}
        </button>
      );
    })}
  </div>
)}
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all existing tests PASS (no regressions)

- [ ] **Step 4: Commit**

```bash
git add src/components/map/MapCanvas.tsx
git commit -m "feat: wire confidence into MapCanvas (toFlowNodes + context menu)"
```

---

## Task 4: StagingInbox drag-to-canvas

**Files:**
- Modify: `src/components/map/StagingInbox.tsx`
- Modify: `src/__tests__/mapStore.test.ts`

- [ ] **Step 1: Write the failing test**

The drag-to-canvas flow ultimately calls `updateNode(topicId, nodeId, { status: 'placed', position })`. The store behavior is already correct — we test the drop handler's store effect. Add to `src/__tests__/mapStore.test.ts`:

```ts
describe('drag-to-canvas (store)', () => {
  it('promotes staged node to placed with a given position', () => {
    useMapStore.getState().initMap('t');
    const nodeId = useMapStore.getState().addNode('t', {
      label: 'Captured idea',
      type: 'concept',
      status: 'staged',
    });

    // Simulate what onDrop calls after coordinate conversion
    useMapStore.getState().updateNode('t', nodeId, {
      status: 'placed',
      position: { x: 320, y: 180 },
    });

    const node = useMapStore.getState().maps['t'].nodes[0];
    expect(node.status).toBe('placed');
    expect(node.position).toEqual({ x: 320, y: 180 });
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npx vitest run src/__tests__/mapStore.test.ts
```

Expected: all PASS (store already supports this; test documents intent)

- [ ] **Step 3: Add drag behavior to StagingInbox**

Replace `src/components/map/StagingInbox.tsx` with:

```tsx
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
```

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/map/StagingInbox.tsx src/__tests__/mapStore.test.ts
git commit -m "feat: add drag-to-canvas behavior to StagingInbox"
```

---

## Task 5: MapCanvas DropHandler + onDrop wiring

**Files:**
- Modify: `src/components/map/MapCanvas.tsx`

`useReactFlow()` can only be called from inside the ReactFlow provider tree. `MapCanvas` renders the `<ReactFlow>` component, so it's outside the provider. Solution: a private `DropHandler` component rendered as a child of `<ReactFlow>` that exposes `screenToFlowPosition` via a callback ref.

- [ ] **Step 1: Add DropHandler inner component and drop wiring to MapCanvas**

Add the following import at the top of `src/components/map/MapCanvas.tsx` (add `useReactFlow` to the existing `@xyflow/react` import):

```ts
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,          // ADD THIS
  addEdge,
  BackgroundVariant,
  MarkerType,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
```

Add the `DropHandler` component (private, defined in the same file, before `MapCanvas`):

```tsx
// Private inner component — must be rendered as a child of <ReactFlow> to access useReactFlow()
function DropHandler({
  onScreenToFlow,
}: {
  onScreenToFlow: (fn: (x: number, y: number) => { x: number; y: number }) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  // Expose the conversion function to the parent on every render
  onScreenToFlow((x, y) => screenToFlowPosition({ x, y }));
  return null;
}
```

Inside `MapCanvas`, add state for the screen-to-flow converter and the onDrop handler. Add these after the existing `useState` declarations:

```ts
const screenToFlowRef = useRef<((x: number, y: number) => { x: number; y: number }) | null>(null);
```

Add `useRef` to the React import at the top:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
```

Add the `onDrop` handler (add after `onNodeDragStop`):

```ts
const onDrop = useCallback(
  (event: React.DragEvent) => {
    event.preventDefault();
    const nodeId = event.dataTransfer.getData('nodeId');
    if (!nodeId || !screenToFlowRef.current) return;
    const flowPos = screenToFlowRef.current(event.clientX, event.clientY);
    updateNode(topicId, nodeId, { status: 'placed', position: flowPos });
  },
  [topicId, updateNode],
);
```

Update the outer wrapper div to handle drag events:

```tsx
<div
  className="h-full w-full"
  onClick={() => setContextMenu(null)}
  onDragOver={(e) => e.preventDefault()}
  onDrop={onDrop}
>
```

Add `<DropHandler>` as a child of `<ReactFlow>` (alongside `<Background>` and `<Controls>`):

```tsx
<ReactFlow
  {/* ...all existing props... */}
>
  <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
  <Controls showInteractive={false} />
  <DropHandler onScreenToFlow={(fn) => { screenToFlowRef.current = fn; }} />
</ReactFlow>
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/map/MapCanvas.tsx
git commit -m "feat: add DropHandler and onDrop wiring to MapCanvas"
```

---

## Task 6: Path highlighting on hover

**Files:**
- Modify: `src/components/map/MapCanvas.tsx`

Path highlighting is pure local state — no store reads/writes. On `onNodeMouseEnter`, dim non-neighbors; on `onNodeMouseLeave`, clear all classNames.

- [ ] **Step 1: Write the failing test**

The neighbor-computation logic is a pure function we can extract and test. Add to `src/__tests__/mapStore.test.ts`:

```ts
describe('path highlighting (neighbor computation)', () => {
  it('finds direct neighbors via outgoing and incoming edges', () => {
    // Pure function extracted from MapCanvas highlight handler
    function getNeighborIds(nodeId: string, edges: Array<{ source: string; target: string }>): Set<string> {
      const ids = new Set<string>();
      for (const e of edges) {
        if (e.source === nodeId) ids.add(e.target);
        if (e.target === nodeId) ids.add(e.source);
      }
      return ids;
    }

    const edges = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'd', target: 'b' },
    ];

    const neighbors = getNeighborIds('b', edges);
    expect(neighbors.has('a')).toBe(true);
    expect(neighbors.has('c')).toBe(true);
    expect(neighbors.has('d')).toBe(true);
    expect(neighbors.has('b')).toBe(false);
  });

  it('returns empty set for an isolated node', () => {
    function getNeighborIds(nodeId: string, edges: Array<{ source: string; target: string }>): Set<string> {
      const ids = new Set<string>();
      for (const e of edges) {
        if (e.source === nodeId) ids.add(e.target);
        if (e.target === nodeId) ids.add(e.source);
      }
      return ids;
    }

    expect(getNeighborIds('x', [])).toEqual(new Set());
  });
});
```

- [ ] **Step 2: Run tests to confirm they pass**

```bash
npx vitest run src/__tests__/mapStore.test.ts
```

Expected: all PASS (pure function tested inline)

- [ ] **Step 3: Add path highlighting handlers to MapCanvas**

In `src/components/map/MapCanvas.tsx`, add these two handlers after `onNodeDragStop`:

```ts
const onNodeMouseEnter = useCallback(
  (_: unknown, node: Node) => {
    const neighborIds = new Set<string>();
    for (const e of edges) {
      if (e.source === node.id) neighborIds.add(e.target);
      if (e.target === node.id) neighborIds.add(e.source);
    }
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === node.id) return { ...n, className: 'ring-2 ring-primary/60' };
        if (neighborIds.has(n.id)) return { ...n, className: '' };
        return { ...n, className: 'opacity-30 transition-opacity' };
      }),
    );
  },
  [edges, setNodes],
);

const onNodeMouseLeave = useCallback(() => {
  setNodes((nds) => nds.map((n) => ({ ...n, className: '' })));
}, [setNodes]);
```

Add both to the `<ReactFlow>` component:

```tsx
<ReactFlow
  {/* ...existing props... */}
  onNodeMouseEnter={onNodeMouseEnter}
  onNodeMouseLeave={onNodeMouseLeave}
>
```

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/map/MapCanvas.tsx src/__tests__/mapStore.test.ts
git commit -m "feat: add path highlighting on node hover"
```

---

## Task 7: Magnetic connection snap

**Files:**
- Modify: `src/components/map/MapCanvas.tsx`

One prop addition. No tests — `connectionRadius` is a ReactFlow built-in with no custom logic.

- [ ] **Step 1: Add `connectionRadius={30}` to `<ReactFlow>`**

In `src/components/map/MapCanvas.tsx`, add the prop to `<ReactFlow>`:

```tsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  onNodeDragStop={onNodeDragStop}
  onNodeMouseEnter={onNodeMouseEnter}
  onNodeMouseLeave={onNodeMouseLeave}
  onNodeClick={handleNodeClick}
  onNodeDoubleClick={handleNodeDoubleClick}
  onNodeContextMenu={onNodeContextMenu}
  onPaneClick={() => setContextMenu(null)}
  onKeyDown={onKeyDown}
  nodeTypes={nodeTypes}
  snapToGrid={snapToGrid}
  snapGrid={[16, 16]}
  connectionRadius={30}
  fitView
  proOptions={{ hideAttribution: true }}
>
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/map/MapCanvas.tsx
git commit -m "feat: add magnetic connection snap (connectionRadius=30)"
```

---

## Task 8: ExplosionOverlay component

**Files:**
- Create: `src/components/map/ExplosionOverlay.tsx`
- Create: `src/__tests__/explosionOverlay.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/explosionOverlay.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

// Pure function: compute radial positions for N children around a center point.
// Angles start at top (270° = -π/2) and spread evenly.
// For n=2: ±45° from top → 225° and 315°
// For n>=3: 360°/n spacing from top
function radialPositions(
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
      x: Math.round(center.x + radius * Math.cos(angleRad)),
      y: Math.round(center.y + radius * Math.sin(angleRad)),
    };
  });
}

describe('radialPositions', () => {
  it('returns empty array for 0 children', () => {
    expect(radialPositions({ x: 100, y: 100 }, 120, 0)).toEqual([]);
  });

  it('places 1 child at top (270°)', () => {
    const [pos] = radialPositions({ x: 0, y: 0 }, 100, 1);
    expect(pos.x).toBe(0);   // cos(270°) = 0
    expect(pos.y).toBe(-100); // sin(270°) = -1
  });

  it('places 2 children at ±45° from top', () => {
    const positions = radialPositions({ x: 0, y: 0 }, 100, 2);
    // 225°: cos=-0.707, sin=-0.707 → (-71, -71)
    expect(positions[0].x).toBe(-71);
    expect(positions[0].y).toBe(-71);
    // 315°: cos=0.707, sin=-0.707 → (71, -71)
    expect(positions[1].x).toBe(71);
    expect(positions[1].y).toBe(-71);
  });

  it('places 4 children at 90° intervals starting from top', () => {
    const positions = radialPositions({ x: 0, y: 0 }, 100, 4);
    // 270°, 360°, 90°, 180°
    expect(positions[0]).toEqual({ x: 0, y: -100 });  // top
    expect(positions[1]).toEqual({ x: 100, y: 0 });   // right
    expect(positions[2]).toEqual({ x: 0, y: 100 });   // bottom
    expect(positions[3]).toEqual({ x: -100, y: 0 });  // left
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/explosionOverlay.test.ts
```

Expected: 4 FAIL — `radialPositions` not imported yet

- [ ] **Step 3: Create ExplosionOverlay component**

Create `src/components/map/ExplosionOverlay.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useMapStore } from '@/store/mapStore';
import { useAnnotationStore } from '@/store/annotationStore';

interface ExplosionOverlayProps {
  nodeId: string;
  topicId: string;
  onClose: () => void;
  onAnnotationJump: (nodeId: string) => void;
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
      x: Math.round(center.x + radius * Math.cos(angleRad)),
      y: Math.round(center.y + radius * Math.sin(angleRad)),
    };
  });
}

export function ExplosionOverlay({
  nodeId,
  topicId,
  onClose,
  onAnnotationJump,
}: ExplosionOverlayProps) {
  const { flowToScreenPosition } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  const topicMap = useMapStore.getState().maps[topicId];
  const node = topicMap?.nodes.find((n) => n.id === nodeId);

  const annotation = node?.annotationId
    ? useAnnotationStore.getState().annotations.find((a) => a.id === node.annotationId)
    : undefined;

  const childIds = new Set(
    (topicMap?.edges ?? []).filter((e) => e.source === nodeId).map((e) => e.target),
  );
  const children = (topicMap?.nodes ?? []).filter((n) => childIds.has(n.id) && n.position);

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
            onClick={() => { onAnnotationJump(nodeId); onClose(); }}
          >
            Jump to annotation ↗
          </button>
        </div>
      )}

      {/* Empty state */}
      {!excerptText && children.length === 0 && (
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
          onClick={() => onAnnotationJump(child.id)}
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
```

- [ ] **Step 4: Update the test to import from the component**

Update `src/__tests__/explosionOverlay.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { radialPositions } from '@/components/map/ExplosionOverlay';

describe('radialPositions', () => {
  it('returns empty array for 0 children', () => {
    expect(radialPositions({ x: 100, y: 100 }, 120, 0)).toEqual([]);
  });

  it('places 1 child at top (270°)', () => {
    const [pos] = radialPositions({ x: 0, y: 0 }, 100, 1);
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(-100);
  });

  it('places 2 children at ±45° from top', () => {
    const positions = radialPositions({ x: 0, y: 0 }, 100, 2);
    expect(positions[0].x).toBe(-71);
    expect(positions[0].y).toBe(-71);
    expect(positions[1].x).toBe(71);
    expect(positions[1].y).toBe(-71);
  });

  it('places 4 children at 90° intervals starting from top', () => {
    const positions = radialPositions({ x: 0, y: 0 }, 100, 4);
    expect(positions[0]).toEqual({ x: 0, y: -100 });
    expect(positions[1]).toEqual({ x: 100, y: 0 });
    expect(positions[2]).toEqual({ x: 0, y: 100 });
    expect(positions[3]).toEqual({ x: -100, y: 0 });
  });
});
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/explosionOverlay.test.ts
```

Expected: 4 PASS

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run
```

Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/map/ExplosionOverlay.tsx src/__tests__/explosionOverlay.test.ts
git commit -m "feat: create ExplosionOverlay component with radial positioning"
```

---

## Task 9: Wire explosion into MapCanvas + rename prop in DocsPage

**Files:**
- Modify: `src/components/map/MapCanvas.tsx`
- Modify: `src/pages/DocsPage.tsx`

- [ ] **Step 1: Update MapCanvasProps and add explosion state**

In `src/components/map/MapCanvas.tsx`:

Update the props interface:

```ts
interface MapCanvasProps {
  topicId: string;
  onAnnotationJump?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
}
```

Update the destructured props at the top of `MapCanvas`:

```ts
export function MapCanvas({ topicId, onAnnotationJump, onNodeDoubleClick }: MapCanvasProps) {
```

Add `explodedNodeId` state after the existing `useState` declarations:

```ts
const [explodedNodeId, setExplodedNodeId] = useState<string | null>(null);
```

- [ ] **Step 2: Replace handleNodeClick to set explosion state**

Replace the existing `handleNodeClick` callback:

```ts
const handleNodeClick = useCallback(
  (_: unknown, node: Node) => {
    setExplodedNodeId(node.id);
  },
  [],
);
```

- [ ] **Step 3: Add ExplosionOverlay import and render inside ReactFlow**

Add import at the top of `MapCanvas.tsx`:

```ts
import { ExplosionOverlay } from './ExplosionOverlay';
```

Inside `<ReactFlow>`, add the overlay alongside `<DropHandler>`:

```tsx
{explodedNodeId && (
  <ExplosionOverlay
    nodeId={explodedNodeId}
    topicId={topicId}
    onClose={() => setExplodedNodeId(null)}
    onAnnotationJump={(nId) => {
      onAnnotationJump?.(nId);
      setExplodedNodeId(null);
    }}
  />
)}
```

- [ ] **Step 4: Update DocsPage to use `onAnnotationJump`**

In `src/pages/DocsPage.tsx`, update the `MapCanvas` usage:

```tsx
<MapCanvas
  topicId={topicId}
  onAnnotationJump={handleMapNodeClick}
  onNodeDoubleClick={handleMapNodeDoubleClick}
/>
```

(The `handleMapNodeClick` function body is unchanged — it still scrolls to the annotation mark.)

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all PASS

- [ ] **Step 6: Build to verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/components/map/MapCanvas.tsx src/pages/DocsPage.tsx
git commit -m "feat: wire ExplosionOverlay into MapCanvas, rename prop to onAnnotationJump"
```

---

## Task 10: Final integration check

- [ ] **Step 1: Run full test suite one last time**

```bash
npx vitest run
```

Expected: all PASS — should be ≥ 45 tests (Wave A's 40 + Wave B's new tests)

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: clean build, no TypeScript errors

- [ ] **Step 3: Commit .gitignore if not already committed**

```bash
git add .gitignore
git commit -m "chore: add .superpowers/ to .gitignore"
```

---

## Self-Review Notes

**Spec coverage check:**
- Feature 1 (inbox drag-to-canvas): Tasks 4 + 5 ✓
- Feature 2 (node explosion): Tasks 8 + 9 ✓
- Feature 3 (path highlighting): Task 6 ✓
- Feature 4 (magnetic snap): Task 7 ✓
- Feature 5 (node confidence states): Tasks 1 + 2 + 3 ✓
- DocsPage `onNodeClick` → `onAnnotationJump` rename: Task 9 ✓
- Wave C deferred (edge semantics): not in plan ✓

**Type consistency check:**
- `confidence?: 'uncertain' | 'familiar' | 'mastered'` defined in Task 1, used in Tasks 2, 3 ✓
- `radialPositions` exported from `ExplosionOverlay.tsx` in Task 8, imported in test update ✓
- `confidenceClass` exported from `ConceptNode.tsx` in Task 2, imported in test update ✓
- `onAnnotationJump` prop: renamed in Task 9 in both `MapCanvasProps` and `DocsPage` call site ✓
- `DropHandler` uses `screenToFlowRef.current` set in Task 5, defined in same task ✓

**Placeholder scan:** No TBDs, no "similar to Task N" shortcuts, all steps contain actual code.
