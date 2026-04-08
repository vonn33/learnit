# Wave B — Interactive Map Canvas Design

**Date:** 2026-04-08
**Status:** Approved

## Overview

Wave B makes the concept map a living learning surface. Five features across two categories:

- **Interaction mechanics** — inbox drag-to-canvas, node explosion, path highlighting, magnetic connection snap
- **Learning signals** — node confidence states

Wave C (deferred): rich edge semantics — relationship types, edge weight/thickness, edge annotations, smart routing.

---

## Architecture Decision

**Persistent enrichment in `mapStore`, transient interaction state in `MapCanvas` component.**

- `confidence` is genuine user data that survives reloads → goes on `MapNode` in `mapStore`
- `explodedNodeId`, `hoveredNodeId` are ephemeral UI state → `useState` in `MapCanvas`
- No new stores introduced in Wave B; Wave C's edge annotations may warrant a `learnerStore` at that point

---

## Data Model

One field added to `MapNode` in `mapStore.ts`:

```ts
confidence?: 'uncertain' | 'familiar' | 'mastered'
```

`NodeUpdate` (already `Partial<Pick<MapNode, ...>>`) picks this up automatically — no store method changes needed.

One piece of transient state added to `MapCanvas`:

```ts
const [explodedNodeId, setExplodedNodeId] = useState<string | null>(null);
```

Path highlighting (Feature 3) requires no state variable — it operates entirely through `setNodes` inside event handlers.

---

## Feature 1: Inbox Drag-to-Canvas

**Behavior:** User grabs a staged node from `StagingInbox`, a ghost copy floats under the cursor. On release over the canvas, the node is placed at the drop position and promoted from `staged` to `placed`.

### StagingInbox changes
- Each item row: `draggable={true}` + `onDragStart` handler
- `onDragStart`: calls `event.dataTransfer.setData('nodeId', node.id)`, creates an off-screen styled ghost element and passes it to `event.dataTransfer.setDragImage()`, removes the ghost element on `setTimeout(0)`

### MapCanvas changes
- Wrapper `div` gets `onDragOver={(e) => e.preventDefault()}` and `onDrop` handler
- `onDrop`: reads `nodeId` from `dataTransfer`, converts cursor position to flow coordinates, calls `updateNode(topicId, nodeId, { status: 'placed', position: flowPos })`
- **Position conversion:** `screenToFlowPosition` from `useReactFlow()` must be called from inside the ReactFlow provider context. A small `DropHandler` inner component is defined in `MapCanvas.tsx`, rendered as a child of `<ReactFlow>`, and exposes the conversion function to the outer component via a callback ref. No new files needed.

---

## Feature 2: Node Explosion

**Behavior:** Single click on any node opens a radial burst overlay — center node label, annotation excerpt below, connected children radiating outward with dashed connector lines. Canvas dims behind the overlay. Click outside or Escape dismisses.

### Interaction changes
- `MapCanvas` handles `onNodeClick` internally (sets `explodedNodeId`) instead of forwarding to `DocsPage`
- `DocsPage`'s `onNodeClick` prop renamed to `onAnnotationJump` — same scroll-to-annotation behavior, now triggered from within the overlay via a "Jump to annotation ↗" link
- Child nodes in the burst are individually clickable and trigger their own explosion

### ExplosionOverlay component
- New component in `src/components/map/ExplosionOverlay.tsx`
- Rendered as a child of `<ReactFlow>` so `useReactFlow().flowToScreenPosition` is available
- Props: `nodeId`, `topicId`, `onClose`, `onAnnotationJump`
- Reads node from `useMapStore.getState()`, annotation excerpt from `useAnnotationStore.getState()` (if `node.annotationId` exists), child nodes from outgoing edges
- Positioned absolutely over the canvas, centered on the exploded node
- Backdrop: semi-transparent `div` covering the canvas, click fires `onClose`
- Escape key listener fires `onClose`
- Empty state: nodes with no annotation and no children show label + "no notes yet" hint
- Radial child positioning: children placed at equal angular intervals (1 child → top; 2 → ±45° from top; 3+ → 360°/n spacing starting from top)

---

## Feature 3: Path Highlighting

**Behavior:** Hovering a node dims all unrelated nodes to `opacity-30`, leaving the hovered node and its direct neighbors at full opacity. Mouse leave resets all nodes.

### MapCanvas changes
- Adds `onNodeMouseEnter` and `onNodeMouseLeave` to `<ReactFlow>`
- `onNodeMouseEnter`: computes `neighborIds` (all nodes connected by any edge to/from hovered node), calls `setNodes` to apply `className: 'opacity-30 transition-opacity'` to non-neighbors, `className: 'ring-2 ring-primary/60'` to hovered node
- `onNodeMouseLeave`: calls `setNodes` to clear all classNames
- Pure local state — no store reads/writes, no new files

---

## Feature 4: Magnetic Connection Snap

**Behavior:** When dragging a new edge, the handle snaps to nearby connection points within a 30px radius.

### MapCanvas changes
- Add `connectionRadius={30}` to `<ReactFlow>`
- One prop, no logic changes

---

## Feature 5: Node Confidence States

**Behavior:** Right-click any node to set its confidence level. The node's border and glow update immediately to reflect the state. Three levels: uncertain (red), familiar (amber), mastered (green). Clicking the active state clears it.

### mapStore changes
- `confidence?: 'uncertain' | 'familiar' | 'mastered'` added to `MapNode` interface

### ConceptNode changes
- `ConceptNodeData` interface gets `confidence?: string`
- Border + shadow class derived from confidence:
  - `uncertain` → `border-red-500/70 shadow-red-500/20 shadow-sm`
  - `familiar` → `border-amber-500/70 shadow-amber-500/20 shadow-sm`
  - `mastered` → `border-green-500/70 shadow-green-500/20 shadow-sm`
  - unset → existing styling unchanged

### MapCanvas changes
- `toFlowNodes` adds `confidence: n.confidence` to each node's data object
- Context menu gets a separator + three new items: "Mark uncertain", "Mark familiar", "Mark mastered"
- Each item shows a small colored dot; the active level shows a checkmark
- Clicking active level calls `updateNode(topicId, nodeId, { confidence: undefined })` (clears)
- Clicking a different level calls `updateNode(topicId, nodeId, { confidence: level })`

---

## Files Changed

| File | Change |
|---|---|
| `src/store/mapStore.ts` | Add `confidence` to `MapNode` + `NodeUpdate` |
| `src/components/map/ConceptNode.tsx` | Add `confidence` to data interface + border styling |
| `src/components/map/MapCanvas.tsx` | Drag drop, explosion state, path highlighting, magnetic snap, confidence context menu, `DropHandler` inner component |
| `src/components/map/StagingInbox.tsx` | Draggable items + ghost drag image |
| `src/pages/DocsPage.tsx` | Rename `onNodeClick` prop to `onAnnotationJump` |
| `src/components/map/ExplosionOverlay.tsx` | New component (or stays in MapCanvas.tsx) |

---

## Testing

- **Drag-to-canvas:** Drop a staged node, verify `status: 'placed'` and correct position in store; drop outside canvas boundary, verify no state change
- **Node explosion:** Click node with annotation → overlay shows excerpt; click node with children → burst shows child chips; click child chip → nested explosion; Escape → dismisses; click outside → dismisses
- **Path highlighting:** Hover node → neighbors at full opacity, others dimmed; mouse leave → all restored
- **Magnetic snap:** Existing `onConnect` tests; snap is a ReactFlow built-in (no custom logic to test)
- **Confidence states:** Set confidence via context menu → ConceptNode border color updates; set same level again → clears; store persists across reload

---

## Wave C (Deferred)

Rich edge semantics:
- Relationship types (causes, supports, contradicts, is-a, etc.)
- Edge weight / visual thickness
- Edge annotations / inline comments
- Smart routing: step/elbow style (map-type dependent) + label positioning to avoid overlap

These share a data model concern (`MapEdge` enrichment) that warrants its own design session.
