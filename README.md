# LearnIt

A local-first reading and annotation tool for personal knowledge documents.

## Stack

Vite 8 · React 19 · React Router v7 · Tailwind v4 · @mdx-js/rollup · @xyflow/react · Zustand · Lucide React

## Development

```bash
npm run dev      # start dev server at localhost:5173
npm run build    # production build
npm run preview  # preview production build
```

---

## Adding content

### Prerequisites

```bash
brew install pandoc   # required for .docx / .pdf conversion
```

### Ingest a document

```bash
npm run ingest path/to/document.docx
```

The CLI will prompt for:

| Prompt | What to enter |
|---|---|
| **Title** | Human-readable title (defaults to filename) |
| **Project** | Pick an existing project or create a new one |
| **Section** | Pick an existing section or create a new one |
| **Position** | Order within the section (defaults to next available) |
| **Description** | Optional subtitle shown in metadata |

After confirmation it:
1. Converts the document to Markdown via pandoc
2. Writes an MDX file to `../learnit/docs/<project>/<section>/<slug>.mdx`
3. Registers the page in `src/data/content-manifest.json`
4. Prints the remaining manual steps

The page appears in the sidebar immediately on next dev server refresh.

### Manual steps after ingest

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

```
../learnit/docs/
├── <project>/
│   ├── index.mdx               ← project landing page
│   └── <section>/
│       ├── index.mdx           ← section landing page
│       └── <slug>.mdx          ← individual document

src/data/content-manifest.json  ← sidebar registry (auto-updated by ingest)
```

The manifest shape:

```json
{
  "<project-key>": {
    "label": "Project Label",
    "link": "project-key/index",
    "sections": {
      "<section-key>": {
        "label": "Section Label",
        "link": "project-key/section-key/index",
        "docs": ["slug-1", "slug-2"]
      }
    }
  }
}
```

To reorder pages within a section: edit the `docs` array in `content-manifest.json` directly.

---

## Annotation system

**Highlights** — select any text in a document to save it. The popover lets you assign tags and add a quick note. Click any highlighted passage to open the note panel.

**Tags** — manage from the Highlights page (Tags button). Tags support drag-to-reorder and cascade-delete (removing a tag removes it from all highlights).

**Diagrams** — create from a preset on the Diagrams page. Nodes are draggable; connections can be drawn between nodes. Auto-layout available in the toolbar.

---

## Data

Everything is stored in `localStorage` under the `handbook:*` namespace. Nothing is sent to a server.

| Key | Contents |
|---|---|
| `handbook:highlights` | All highlight annotations |
| `handbook:tags` | Tag definitions and order |
| `handbook:user-diagrams` | User-created diagrams |
| `handbook:diagram-layouts` | Saved node positions for concept maps |
| `handbook:reading-progress` | Scroll position per page |
| `handbook:ui` | Theme preference |

**Export / Import** — Settings page or the Highlights page toolbar. Export produces a JSON snapshot. Import supports merge (add non-duplicate items) or replace (overwrite everything).

