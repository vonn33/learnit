// Single source of truth for stacking layers.
//
// Tailwind classes (z-19/z-20/z-21/z-30/...) elsewhere mirror these values; if
// you change them here, update those classes too. Values must stay in sync.
//
// Layer system:
//   FOCUS_RIGHT_PANE (18) — DocsPage focus-right map wrapper; below DOC_TOOLBAR so toolbar buttons stay clickable
//   DOC_TOOLBAR      (19) — DocsPage workspace toolbar (under Navbar)
//   NAVBAR           (20) — top app bar (sticky)
//   PROGRESS_BAR     (21) — reading progress strip (overlays top edge of Navbar)
//   FAB              (30) — floating action buttons (mobile sidebar toggle)
//   OVERLAY          (40) — modal backdrops, mid-canvas overlays
//   OVERLAY_SVG      (41) — SVG connector lines drawn over an overlay
//   OVERLAY_UI       (43) — interactive chips/popups on top of an overlay
//   TOPMOST          (50) — popovers, palettes, modal content, toolbars

export const Z = {
  FOCUS_RIGHT_PANE: 18,
  DOC_TOOLBAR: 19,
  NAVBAR: 20,
  PROGRESS_BAR: 21,
  FAB: 30,
  OVERLAY: 40,
  OVERLAY_SVG: 41,
  OVERLAY_UI: 43,
  TOPMOST: 50,
} as const;
