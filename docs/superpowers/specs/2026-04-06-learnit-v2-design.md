# learnit v2 — Learning Companion Design

**Date:** 2026-04-06  
**Status:** Approved  

---

## Vision

learnit v2 is a personal learning companion built around a single core principle: **capture now, refine later**. Nothing is ever locked in. All interactions with learning content — highlights, notes, concept links, map layouts — are permanently mutable, reflecting the fundamental nature of building and updating a mental model over time.

The central metaphor is **zoom**: the ability to see the big picture or focus on the details as needed. A concept map gives structure and overview; the reader gives depth.

---

## 1. Layout Architecture

The workspace is a **dual-pane split**:
- **Left pane:** Map canvas
- **Right pane:** Reader

Each pane supports three states:
- **Split** — default; both visible; resizable drag handle between them
- **Focused** — one pane expands to near-full width; the other collapses to a slim strip (clickable to restore)
- **Full** — single pane fills the screen; toggle button to return to split

**Navigation** (topic/doc selection) lives outside both panes — a persistent sidebar or top-level nav that remains accessible regardless of pane state.

---

## 2. Content Layers

Three strictly separated layers:

| Layer | Description | Mutable |
|-------|-------------|---------|
| **Content** | Raw MDX/docs source | No (read-only) |
| **Annotation** | Highlights, notes, quick captures, node-links | Yes |
| **Map** | Nodes, edges, groups, inbox | Yes |

The annotation layer is **visible by default** in the reader. A single toggle button (top of reader pane) switches between the annotated view and the raw source. This is a pure display toggle — underlying data is unaffected.

---

## 3. The Map

Each topic/document has its own map. Maps are **modular and lego-like** — isolated by default, extensible by the user.

### Seeding
The ingest pipeline (`scripts/ingest.ts`) is extended to generate an initial map scaffold from the content manifest — structural nodes derived from headings and sections. This is the starting state of each map.

### Node Types
- **Structural nodes** — ingest-generated from content outline; visually distinct (e.g. muted style)
- **Concept nodes** — user-created from text selection or manual addition; primary visual weight
- **Staged nodes** — quick captures awaiting promotion; live in the inbox, not placed on canvas
- **Super-nodes** — collapsed references to other maps; double-click to drill into the linked map

### Edges
- Directional or bidirectional
- Labeled or unlabeled
- Auto-routed around nodes; manually adjustable via drag handles on edge paths

### Groups & Clusters
- Nodes can be grouped; groups collapse to a single node with a count badge
- Collapsing/expanding is the primary "zoom out / zoom in" mechanism

### Cross-map Linking
Maps can reference other maps as collapsed super-nodes. This allows a unified knowledge graph to emerge organically from individual topic maps — without forcing a single top-down structure from the start.

---

## 4. Staging Inbox

Quick captures that haven't been placed on the map live in a **staging inbox** — a dedicated region of the map panel (e.g. a collapsible tray at the bottom or side of the canvas).

- Staged nodes have `status: "staged"` in the data model
- They are visible on the map panel but not placed on the canvas
- Promoted by dragging from the inbox onto the canvas
- Can be renamed, connected, or dismissed at any time

The inbox ensures nothing gets lost during reading flow without cluttering the working map.

---

## 5. Selection Popup & Reader-Map Bridge

When text is selected in the reader, the popup offers:

**Quick capture (flow-preserving):**
- One-tap flag as important → creates a staged node in the inbox, no further action required

**Full interaction (when you want to act immediately):**
- **Add to map as node** — creates a new concept node, pre-filled with selected text
- **Connect to existing node** — searchable picker of current map nodes; creates a labeled edge
- **Highlight + tag as concept** — combines highlight with node creation; the highlight gets a visual indicator showing it's map-linked

### Bi-directional Linking
- Clicking a map node with a reader link → scrolls and highlights the corresponding passage in the reader
- Clicking a linked highlight in the reader → pulses/focuses the corresponding node on the map

All links are optional and removable at any time.

---

## 6. Map Interaction Mechanics

Built on `@xyflow/react` (already in the codebase).

- **Drag-and-drop** — nodes freely draggable; groups drag together; inbox items drag onto canvas to promote
- **Magnetic connections** — dragging from a node's edge handle snaps to nearest valid target with visual pull indicator; confirmed on release
- **Smart edge routing** — edges auto-route around nodes; straighten on double-click; manually adjustable
- **Snap-to-grid / free placement** — toggleable; grid for structured layouts, free for organic maps
- **Collapse/expand** — groups and super-nodes collapse to badge nodes; double-click to expand
- **Context menu (right-click)** — rename, delete, connect, promote from inbox, open linked reader section
- **Multi-select** — shift+click or lasso; move or group selected nodes together

The map is a **thinking space**, not a diagram editor — interactions should feel fluid and low-friction.

---

## 7. Data Model & Persistence

All state is managed in **Zustand with persistence** (localStorage), extending the existing `useHandbookStore` pattern.

### Stores

**`useAnnotationStore`**
```ts
interface Annotation {
  id: string;
  docId: string;
  position: { start: number; end: number }; // character offsets
  type: 'highlight' | 'note' | 'quick-capture';
  text: string;
  note?: string;
  mapNodeId?: string; // bi-directional link
  createdAt: string;
}
```

**`useMapStore`**
```ts
interface MapNode {
  id: string;
  topicId: string;
  label: string;
  type: 'structural' | 'concept' | 'super-node';
  status: 'placed' | 'staged';
  position?: { x: number; y: number };
  annotationId?: string; // bi-directional link
  linkedMapId?: string;  // for super-nodes
}

interface MapEdge {
  id: string;
  topicId: string;
  source: string;
  target: string;
  label?: string;
  direction: 'forward' | 'backward' | 'bidirectional';
}
```

### Ingest Extension
`scripts/ingest.ts` is extended to output a `map-scaffold.json` per topic — a set of structural nodes derived from the manifest headings. This is loaded into the map store on first open of a topic.

---

## 8. Core Principle

> All interactions are first drafts. Nodes, edges, highlights, connections, and layouts are permanently mutable. The map is a living document that grows and evolves with understanding.

---

## Out of Scope (v2)

- Backend/sync — fully local, localStorage only
- AI-generated connections or summaries
- Export or sharing
- Mobile layout

---

## Future Considerations

**Mobile-first is the long-term target.** Phone and tablet are expected to be the primary modes of use. All future design decisions should account for mobile-first adaptations — touch gestures, responsive layouts, thumb-reachable controls, etc.

For v2, the priority is a usable laptop MVP. Mobile adaptations follow in subsequent versions, but should not be designed against — avoid patterns that would be hard to port to touch interfaces.
