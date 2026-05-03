# LearnIt

A reading and annotation tool for personal knowledge documents, backed by Supabase for cross-device sync.

## Stack

Vite 8 · React 19 · React Router v7 · Tailwind v4 · @mdx-js/rollup · @xyflow/react · Zustand · Supabase · Lucide React

## Development

```bash
npm run dev      # start dev server at localhost:5173
npm run build    # production build
npm run preview  # preview production build
npm run test     # vitest single run
```

`.env.local` must define `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## Adding content

Documents live in Supabase (Postgres). Upload via the in-app Import wizard
(`src/components/import/ImportWizard.tsx`) — paste or drop a `.md` file, set
project / section / title, and submit. The sidebar reads from `docStore`
which fetches from Supabase at boot and subscribes to realtime changes, so
new documents appear without a refresh.

To rename, retag, or delete a document, use the Content Management page
(`/manage`).

### Manual steps after upload

**Tables** — pandoc produces raw Markdown tables. Structured comparison tables work better as `<DataTable>`:

```mdx
<DataTable
  headers={["Feature", "Fluent Forever", "Nation"]}
  rows={[
    ["Approach", "Bottom-up phonetics", "Top-down frequency"],
    ["Deck system", "Anki", "None"],
  ]}
/>
```

**Content components** — annotate key passages with:

```mdx
<Verdict type="strong" label="Recommendation">
  Use spaced repetition from day one.
</Verdict>

<Callout label="Note">
  This applies only to alphabet-based languages.
</Callout>

<Compare
  left={{title: "Fluent Forever", body: "Phonetics-first approach"}}
  right={{title: "Nation", body: "Frequency-based approach"}}
/>
```

`type` on `<Verdict>`: `strong` (green) · `nuanced` (amber) · `weak` (red) · `info` (blue)

**Concept maps** — create a diagram JSON at `../learnit/static/diagrams/<slug>.diagram.json`:

```json
{
  "nodes": [
    {"id": "a", "position": {"x": 0, "y": 0}, "data": {"label": "Concept A"}},
    {"id": "b", "position": {"x": 200, "y": 0}, "data": {"label": "Concept B"}}
  ],
  "edges": [
    {"id": "e1", "source": "a", "target": "b"}
  ]
}
```

Then reference it in the MDX:

```mdx
<ConceptMap pageId="my-page-slug" src="/diagrams/my-page-slug.diagram.json" />
```

---

## Content structure

Documents live in the Supabase `docs` table. Each row carries `project`,
`section`, `slug`, `title`, `content_md`, and a derived `toc_json`. The
sidebar groups documents by `project` -> `section` and sorts entries by
`created_at`. There is no static manifest — the registry is the live result
of `docStore.fetchAll()`.

---

## Annotation system

**Highlights** — select any text in a document to save it. The popover lets you assign tags and add a quick note. Click any highlighted passage to open the note panel.

**Tags** — manage from the Highlights page (Tags button). Tags support drag-to-reorder and cascade-delete (removing a tag removes it from all highlights).

**Diagrams** — create from a preset on the Diagrams page. Nodes are draggable; connections can be drawn between nodes. Auto-layout available in the toolbar.

---

## Data

Documents, annotations, tags, and concept maps are stored in Supabase
(Postgres) and sync across devices via realtime subscriptions. UI-layout
state (theme, split-pane mode) is the only thing that still persists in
`localStorage` under the `handbook:*` namespace.

**Export / Import** — Settings page or the Highlights page toolbar. Export produces a JSON snapshot. Import supports merge (add non-duplicate items) or replace (overwrite everything).

