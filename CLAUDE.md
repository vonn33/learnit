# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server at localhost:5173
npm run build        # TypeScript check + production build
npm run test         # Run Vitest unit tests (single run)
npm run test:watch   # Vitest in watch mode
npm run ingest       # Interactive CLI to ingest .docx/.pdf documents
```

## Architecture

**LearnIt** is a local-first reading and annotation tool. All state persists in `localStorage` under `handbook:*` keys — there is no server or API.

### State & Data Flow

Three Zustand stores (with `persist` middleware) are the single source of truth:
- `annotationStore` — highlights, notes, tags
- `mapStore` — concept map nodes/edges per document
- `workspaceStore` — UI layout (split/focus-left/focus-right modes)

### Document Loading

Documents live in `docs/<project>/<section>/<slug>.mdx` and are lazy-loaded via `import.meta.glob()` in `src/data/` or the DocsPage. The ingest CLI adds new documents and updates `src/data/content-manifest.json` (the sidebar registry).

### Two-Pane Layout

`DocsPage` renders a split workspace:
- **Left pane** — MDX document + `AnnotationLayer` (applies highlight spans to DOM using character offsets + anchor context for fuzzy re-matching)
- **Right pane** — `MapCanvas` (ReactFlow-based concept map); nodes link back to annotations

### Concept Map Model

Nodes have: `type` (`structural` | `concept` | `super-node`), `status` (`placed` | `staged`), `confidence` (`uncertain` | `familiar` | `mastered`)

Edges have: `relationshipType` (`causes` | `supports` | `contradicts` | `is-a`) and optional `note`

The staging inbox (`status: "staged"`) allows dragged highlights to become nodes before being positioned on the canvas.

### Path Alias

`@/` maps to `src/` — use this for all internal imports.

### Key Files

| Path | Purpose |
|---|---|
| `src/store/` | All application state |
| `src/components/map/` | Concept map canvas, nodes, edge popover |
| `src/components/reader/` | Highlight toolbar, annotation layer, note panel |
| `src/lib/highlights.ts` | Anchor context & highlight application logic |
| `src/lib/autoLayout.ts` | Graph auto-layout algorithm |
| `src/data/content-manifest.json` | Sidebar registry (auto-generated, do not edit manually) |
