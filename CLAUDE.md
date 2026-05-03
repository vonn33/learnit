# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server at localhost:5173
npm run build        # TypeScript check + production build
npm run test         # Run Vitest unit tests (single run)
npm run test:watch   # Vitest in watch mode
```

## Architecture

**LearnIt** is a reading and annotation tool. Documents, annotations, and concept maps persist in Supabase (Postgres) and sync across devices via realtime subscriptions. Only UI-layout state (`workspaceStore`) lives in `localStorage`.

### State & Data Flow

Four Zustand stores are the single source of truth. `annotationStore`, `mapStore`, and `docStore` back to Supabase (Postgres) and subscribe to realtime changes; `workspaceStore` is local-only UI state:
- `annotationStore` — highlights, notes, tags (Supabase)
- `mapStore` — concept map nodes/edges per document (Supabase)
- `docStore` — uploaded documents and their content (Supabase)
- `workspaceStore` — UI layout (split/focus-left/focus-right modes)

### Document Loading

Documents live in Supabase. Users upload `.md` files via the Import wizard (`src/components/import/ImportWizard.tsx`). The sidebar registry is the live result of `docStore.fetchAll()`.

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
| `src/store/docStore.ts` | Document CRUD + realtime subscription against Supabase |
| `src/lib/supabase.ts` | Supabase client + row types (`DocRow`, `AnnotationRow`, etc.) |
| `src/components/map/` | Concept map canvas, nodes, edge popover |
| `src/components/reader/` | Highlight toolbar, annotation layer, note panel |
| `src/components/reader/TOCPanel.tsx` | Per-document table of contents from `toc_json` |
| `src/components/mdx/RuntimeMdx.tsx` | Renders Markdown content fetched from Supabase at runtime |
| `src/components/import/` | Import wizard for uploading `.md` files into Supabase |
| `src/pages/ContentManagementPage.tsx` | Manage / rename / delete uploaded documents |
| `src/lib/highlights.ts` | Anchor context & highlight application logic |
| `src/lib/autoLayout.ts` | Graph auto-layout algorithm |
