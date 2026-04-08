# Wave C — Edge Semantics Design

**Date:** 2026-04-08
**Status:** Approved
**Scope:** Rich relationship types and notes on map edges

---

## Overview

Wave C adds a unified system for expressing *what a connection means* — without cluttering the canvas. Each edge gets an optional relationship type (visually encoded as color) and an optional free-text note. Both are authored through a lightweight floating popover triggered by clicking the edge.

Dropped from the original Wave C backlog: smart routing (ReactFlow edges are already free-form), edge weight/thickness (color carries sufficient meaning).

---

## Data Model

### `MapEdge` additions (`src/store/mapStore.ts`)

```ts
export interface MapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  direction: 'forward' | 'backward' | 'bidirectional'; // unchanged
  relationshipType?: 'causes' | 'supports' | 'contradicts' | 'is-a'; // new
  note?: string;                                                        // new
}
```

### `EdgeUpdate` type

```ts
type EdgeUpdate = Partial<Pick<MapEdge, 'relationshipType' | 'note' | 'label' | 'direction'>>;
```

### New store action

```ts
updateEdge: (topicId: string, edgeId: string, patch: EdgeUpdate) => void
```

Implemented as a standard immutable map over `map.edges`, identical in shape to the existing `updateNode`. `removeEdge` already exists and is reused as-is for the delete action in the popover.

---

## Visual Encoding

### `edgeStyle` pure helper (exported from `MapCanvas.tsx`)

```ts
export function edgeStyle(type?: MapEdge['relationshipType']): {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  markerType: MarkerType;
}
```

| Type | Color | Width | Dash | Arrowhead |
|---|---|---|---|---|
| `causes` | `#f97316` (orange) | 2 | solid | ArrowClosed |
| `supports` | `#22c55e` (green) | 2 | solid | ArrowClosed |
| `contradicts` | `#ef4444` (red) | 2 | `6,3` | ArrowClosed |
| `is-a` | `#a78bfa` (purple) | 1.5 | solid | Arrow (open) |
| untyped | `#334155` (gray) | 1.5 | `3,3` | ArrowClosed |

`toFlowEdges` in `MapCanvas` calls `edgeStyle` to populate each ReactFlow edge's `style` and `markerEnd.color`. The existing `direction` logic controlling `markerStart`/`markerEnd` presence is orthogonal and unchanged.

---

## EdgePopover Component

**File:** `src/components/map/EdgePopover.tsx`

### Props

```ts
interface EdgePopoverProps {
  edgeId: string;
  topicId: string;
  position: { x: number; y: number };
  onClose: () => void;
}
```

### Behaviour

- Reads the edge reactively via `useMapStore((s) => s.maps[topicId]?.edges.find(...))`
- **Type picker:** 5 pills — `causes`, `supports`, `contradicts`, `is-a`, `✕ none`. Active type rendered in its corresponding color. Clicking the active type clears it (toggle off). Clicking `✕ none` explicitly clears.
- **Note field:** `<textarea>` — calls `updateEdge` on `onBlur`, not on every keystroke, to avoid thrashing the store.
- **Delete:** calls `removeEdge(topicId, edgeId)` then `onClose()`.
- **Positioning:** `position: fixed` at `{ left: x, top: y }`. Clamped to viewport bounds so the popover never renders off-screen.
- **Dismissal:** Escape key (document `keydown` listener) and click-outside (document `mousedown` listener), both cleaned up on unmount.
- Rendered **outside** `<ReactFlow>` in the `MapCanvas` wrapper div — no `useReactFlow()` needed.

---

## MapCanvas Wiring

### New state

```ts
const [selectedEdge, setSelectedEdge] = useState<{
  id: string;
  x: number;
  y: number;
} | null>(null);
```

### New handler

```ts
const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
  setSelectedEdge({ id: edge.id, x: event.clientX, y: event.clientY });
}, []);
```

### JSX additions

`onEdgeClick` added to `<ReactFlow>`. `setSelectedEdge(null)` added to the existing `onPaneClick` handler so pane clicks close the popover alongside the context menu.

`EdgePopover` rendered in the wrapper div (alongside the existing context menu):

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

---

## Testing

### `src/__tests__/mapStore.test.ts` — additions to new `describe('edge semantics (store)')`

- `updateEdge` sets `relationshipType` on an edge
- `updateEdge` sets `note` on an edge
- `updateEdge` clears `relationshipType` when set to `undefined`
- `updateEdge` does not affect other edges in the same map

### `src/__tests__/edgeSemantics.test.ts` — new file

Tests the pure `edgeStyle` helper (imported from `MapCanvas`):

- `causes` → `#f97316`, solid, `MarkerType.ArrowClosed`
- `supports` → `#22c55e`, solid, `MarkerType.ArrowClosed`
- `contradicts` → `#ef4444`, dashed `6,3`, `MarkerType.ArrowClosed`
- `is-a` → `#a78bfa`, solid, `MarkerType.Arrow`
- `undefined` → `#334155`, dashed `3,3`, `MarkerType.ArrowClosed`

---

## Files Changed

| File | Change |
|---|---|
| `src/store/mapStore.ts` | Add `relationshipType`, `note` to `MapEdge`; add `EdgeUpdate` type; add `updateEdge` action |
| `src/components/map/MapCanvas.tsx` | Export `edgeStyle` helper; update `toFlowEdges`; add `selectedEdge` state, `onEdgeClick` handler, `onPaneClick` extension, `EdgePopover` render |
| `src/components/map/EdgePopover.tsx` | New component |
| `src/__tests__/mapStore.test.ts` | Add `edge semantics (store)` describe block |
| `src/__tests__/edgeSemantics.test.ts` | New test file for `edgeStyle` helper |

---

## Out of Scope (deferred)

- Smart routing / elbow edges
- Edge weight / thickness
- Edge-to-edge connections
- Relationship type on scaffold-generated edges (scaffold always creates untyped edges)
