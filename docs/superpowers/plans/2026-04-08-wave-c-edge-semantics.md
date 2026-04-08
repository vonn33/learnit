# Wave C — Edge Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add relationship types (causes/supports/contradicts/is-a) and free-text notes to map edges, with color-coded visual encoding and a floating popover for authoring.

**Architecture:** Extend `MapEdge` in the store with `relationshipType` and `note` fields plus an `updateEdge` action. A pure `edgeStyle` helper drives visual encoding in `toFlowEdges`. A new `EdgePopover` component renders fixed-positioned near the clicked edge and is wired into `MapCanvas` via `onEdgeClick`.

**Tech Stack:** React 18, Zustand (persist middleware), @xyflow/react, Tailwind CSS, Vitest

---

## File Map

| File | Change |
|---|---|
| `src/store/mapStore.ts` | Add `relationshipType?`, `note?` to `MapEdge`; add `EdgeUpdate` type; add `updateEdge` action |
| `src/components/map/MapCanvas.tsx` | Export `edgeStyle` pure helper; update `toFlowEdges`; add `selectedEdge` state, `onEdgeClick`, extend `onPaneClick`, render `EdgePopover` |
| `src/components/map/EdgePopover.tsx` | New component — type picker + note field + delete |
| `src/__tests__/mapStore.test.ts` | Add `edge semantics (store)` describe block (4 tests) |
| `src/__tests__/edgeSemantics.test.ts` | New file — tests for `edgeStyle` pure helper (5 tests) |

---

## Task 1: Extend MapEdge + add updateEdge

**Files:**
- Modify: `src/store/mapStore.ts`
- Test: `src/__tests__/mapStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Add this `describe` block at the bottom of `src/__tests__/mapStore.test.ts` (after all existing describes):

```ts
describe('edge semantics (store)', () => {
  it('updateEdge sets relationshipType on an edge', () => {
    const store = useMapStore.getState();
    store.initMap('es1');
    const nA = store.addNode('es1', { label: 'A', type: 'concept', status: 'placed' });
    const nB = store.addNode('es1', { label: 'B', type: 'concept', status: 'placed' });
    const eId = store.addEdge('es1', { source: nA, target: nB, direction: 'forward' });
    store.updateEdge('es1', eId, { relationshipType: 'causes' });
    const edge = useMapStore.getState().maps['es1'].edges.find((e) => e.id === eId);
    expect(edge?.relationshipType).toBe('causes');
  });

  it('updateEdge sets note on an edge', () => {
    const store = useMapStore.getState();
    store.initMap('es2');
    const nA = store.addNode('es2', { label: 'A', type: 'concept', status: 'placed' });
    const nB = store.addNode('es2', { label: 'B', type: 'concept', status: 'placed' });
    const eId = store.addEdge('es2', { source: nA, target: nB, direction: 'forward' });
    store.updateEdge('es2', eId, { note: 'important link' });
    const edge = useMapStore.getState().maps['es2'].edges.find((e) => e.id === eId);
    expect(edge?.note).toBe('important link');
  });

  it('updateEdge clears relationshipType when set to undefined', () => {
    const store = useMapStore.getState();
    store.initMap('es3');
    const nA = store.addNode('es3', { label: 'A', type: 'concept', status: 'placed' });
    const nB = store.addNode('es3', { label: 'B', type: 'concept', status: 'placed' });
    const eId = store.addEdge('es3', { source: nA, target: nB, direction: 'forward' });
    store.updateEdge('es3', eId, { relationshipType: 'causes' });
    store.updateEdge('es3', eId, { relationshipType: undefined });
    const edge = useMapStore.getState().maps['es3'].edges.find((e) => e.id === eId);
    expect(edge?.relationshipType).toBeUndefined();
  });

  it('updateEdge does not affect other edges in the same map', () => {
    const store = useMapStore.getState();
    store.initMap('es4');
    const nA = store.addNode('es4', { label: 'A', type: 'concept', status: 'placed' });
    const nB = store.addNode('es4', { label: 'B', type: 'concept', status: 'placed' });
    const nC = store.addNode('es4', { label: 'C', type: 'concept', status: 'placed' });
    const eAB = store.addEdge('es4', { source: nA, target: nB, direction: 'forward' });
    const eBC = store.addEdge('es4', { source: nB, target: nC, direction: 'forward' });
    store.updateEdge('es4', eAB, { relationshipType: 'causes' });
    const edgeBC = useMapStore.getState().maps['es4'].edges.find((e) => e.id === eBC);
    expect(edgeBC?.relationshipType).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/__tests__/mapStore.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: 4 failures with `TypeError: store.updateEdge is not a function`

- [ ] **Step 3: Implement — extend MapEdge + add updateEdge**

Replace the `MapEdge` interface and add `EdgeUpdate` + `updateEdge` to `src/store/mapStore.ts`:

```ts
// Replace existing MapEdge interface:
export interface MapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  direction: 'forward' | 'backward' | 'bidirectional';
  relationshipType?: 'causes' | 'supports' | 'contradicts' | 'is-a';
  note?: string;
}
```

```ts
// Add after the existing NodeUpdate type line:
type EdgeUpdate = Partial<Pick<MapEdge, 'relationshipType' | 'note' | 'label' | 'direction'>>;
```

Add `updateEdge` to the `MapStore` interface (after `addEdge`):

```ts
updateEdge: (topicId: string, edgeId: string, patch: EdgeUpdate) => void;
```

Add the implementation inside `create()(persist(...))` (after the `addEdge` implementation):

```ts
updateEdge: (topicId, edgeId, patch) => {
  set((s) => {
    const map = s.maps[topicId];
    if (!map) return s;
    return {
      maps: {
        ...s.maps,
        [topicId]: {
          ...map,
          edges: map.edges.map((e) =>
            e.id === edgeId ? { ...e, ...patch } : e,
          ),
        },
      },
    };
  });
},
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/__tests__/mapStore.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: all tests in `mapStore.test.ts` pass, including the 4 new `edge semantics (store)` tests

- [ ] **Step 5: Commit**

```bash
git add src/store/mapStore.ts src/__tests__/mapStore.test.ts
git commit -m "feat: extend MapEdge with relationshipType/note and add updateEdge action"
```

---

## Task 2: edgeStyle helper + toFlowEdges update

**Files:**
- Modify: `src/components/map/MapCanvas.tsx`
- Create: `src/__tests__/edgeSemantics.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/edgeSemantics.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MarkerType } from '@xyflow/react';
import { edgeStyle } from '@/components/map/MapCanvas';

describe('edgeStyle', () => {
  it('causes → orange, solid, ArrowClosed', () => {
    const s = edgeStyle('causes');
    expect(s.stroke).toBe('#f97316');
    expect(s.strokeDasharray).toBeUndefined();
    expect(s.markerType).toBe(MarkerType.ArrowClosed);
  });

  it('supports → green, solid, ArrowClosed', () => {
    const s = edgeStyle('supports');
    expect(s.stroke).toBe('#22c55e');
    expect(s.strokeDasharray).toBeUndefined();
    expect(s.markerType).toBe(MarkerType.ArrowClosed);
  });

  it('contradicts → red, dashed 6,3, ArrowClosed', () => {
    const s = edgeStyle('contradicts');
    expect(s.stroke).toBe('#ef4444');
    expect(s.strokeDasharray).toBe('6,3');
    expect(s.markerType).toBe(MarkerType.ArrowClosed);
  });

  it('is-a → purple, solid, Arrow (open)', () => {
    const s = edgeStyle('is-a');
    expect(s.stroke).toBe('#a78bfa');
    expect(s.strokeDasharray).toBeUndefined();
    expect(s.markerType).toBe(MarkerType.Arrow);
  });

  it('undefined → gray, dashed 3,3, ArrowClosed (untyped default)', () => {
    const s = edgeStyle(undefined);
    expect(s.stroke).toBe('#334155');
    expect(s.strokeDasharray).toBe('3,3');
    expect(s.markerType).toBe(MarkerType.ArrowClosed);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/__tests__/edgeSemantics.test.ts --reporter=verbose 2>&1 | tail -15
```

Expected: 5 failures with `SyntaxError: The requested module ... does not provide an export named 'edgeStyle'`

- [ ] **Step 3: Add edgeStyle to MapCanvas.tsx**

Add this function just before the `toFlowEdges` function in `src/components/map/MapCanvas.tsx`. It needs `MapEdge` (already imported from `@/store/mapStore`) and `MarkerType` (already imported from `@xyflow/react`):

```ts
// Add before toFlowEdges:
export function edgeStyle(type?: MapEdge['relationshipType']): {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  markerType: MarkerType;
} {
  switch (type) {
    case 'causes':      return { stroke: '#f97316', strokeWidth: 2, markerType: MarkerType.ArrowClosed };
    case 'supports':    return { stroke: '#22c55e', strokeWidth: 2, markerType: MarkerType.ArrowClosed };
    case 'contradicts': return { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '6,3', markerType: MarkerType.ArrowClosed };
    case 'is-a':        return { stroke: '#a78bfa', strokeWidth: 1.5, markerType: MarkerType.Arrow };
    default:            return { stroke: '#334155', strokeWidth: 1.5, strokeDasharray: '3,3', markerType: MarkerType.ArrowClosed };
  }
}
```

Then replace the existing `toFlowEdges` function:

```ts
function toFlowEdges(mapEdges: MapEdge[]): Edge[] {
  return mapEdges.map((e) => {
    const { stroke, strokeWidth, strokeDasharray, markerType } = edgeStyle(e.relationshipType);
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      style: { stroke, strokeWidth, strokeDasharray },
      markerEnd:
        e.direction !== 'backward'
          ? { type: markerType, color: stroke }
          : undefined,
      markerStart:
        e.direction === 'backward' || e.direction === 'bidirectional'
          ? { type: markerType, color: stroke }
          : undefined,
    };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/__tests__/edgeSemantics.test.ts --reporter=verbose 2>&1 | tail -15
```

Expected: all 5 pass

- [ ] **Step 5: Run full suite to verify nothing broken**

```bash
npm test -- --reporter=verbose 2>&1 | tail -10
```

Expected: all tests pass (previously 54, now 63 — 4 from Task 1 + 5 new)

- [ ] **Step 6: Commit**

```bash
git add src/components/map/MapCanvas.tsx src/__tests__/edgeSemantics.test.ts
git commit -m "feat: add edgeStyle helper and color-coded edge rendering"
```

---

## Task 3: EdgePopover component

**Files:**
- Create: `src/components/map/EdgePopover.tsx`

No new tests — the store actions are covered by Task 1. The popover is wired and manually verified in Task 4.

- [ ] **Step 1: Create EdgePopover.tsx**

Create `src/components/map/EdgePopover.tsx`:

```tsx
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
```

- [ ] **Step 2: Run full test suite to confirm no regressions**

```bash
npm test -- --reporter=verbose 2>&1 | tail -10
```

Expected: all 63 tests pass (new file has no tests of its own)

- [ ] **Step 3: Commit**

```bash
git add src/components/map/EdgePopover.tsx
git commit -m "feat: create EdgePopover component with type picker and note field"
```

---

## Task 4: Wire EdgePopover into MapCanvas

**Files:**
- Modify: `src/components/map/MapCanvas.tsx`

- [ ] **Step 1: Add EdgePopover import**

Add to the existing component imports block near the top of `src/components/map/MapCanvas.tsx` (after the `ExplosionOverlay` import):

```ts
import { EdgePopover } from './EdgePopover';
```

- [ ] **Step 2: Add selectedEdge state**

Add this line directly after the existing `const [explodedNodeId, setExplodedNodeId] = useState<string | null>(null);` line:

```ts
const [selectedEdge, setSelectedEdge] = useState<{ id: string; x: number; y: number } | null>(null);
```

- [ ] **Step 3: Add onEdgeClick handler**

Add this after the existing `handleNodeClick` callback:

```ts
const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
  setSelectedEdge({ id: edge.id, x: event.clientX, y: event.clientY });
}, []);
```

- [ ] **Step 4: Extend onPaneClick and add onEdgeClick to ReactFlow**

Find the existing `onPaneClick={() => setContextMenu(null)}` prop on `<ReactFlow>` and replace it:

```tsx
onPaneClick={() => { setContextMenu(null); setSelectedEdge(null); }}
```

Add `onEdgeClick={onEdgeClick}` to `<ReactFlow>` alongside the other handlers.

- [ ] **Step 5: Render EdgePopover in the wrapper div**

Add `EdgePopover` in the outer wrapper `<div>` alongside the existing context menu block. Place it just after the closing `)}` of the `contextMenu &&` block:

```tsx
{selectedEdge && (
  <EdgePopover
    edgeId={selectedEdge.id}
    topicId={topicId}
    position={{ x: selectedEdge.x, y: selectedEdge.y }}
    onClose={() => setSelectedEdge(null)}
  />
)}
```

- [ ] **Step 6: Run full test suite**

```bash
npm test -- --reporter=verbose 2>&1 | tail -10
```

Expected: all 63 tests pass

- [ ] **Step 7: Commit**

```bash
git add src/components/map/MapCanvas.tsx
git commit -m "feat: wire EdgePopover into MapCanvas via onEdgeClick"
```
