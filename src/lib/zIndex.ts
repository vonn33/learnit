// Single source of truth for stacking layers.
//
// Tailwind classes (z-30/z-40/z-50) elsewhere mirror these values; if you
// change them here, update those classes too. Values must stay in sync.
//
// Layer system:
//   FAB         (30) — floating action buttons (mobile sidebar toggle)
//   OVERLAY     (40) — modal backdrops, mid-canvas overlays
//   OVERLAY_SVG (41) — SVG connector lines drawn over an overlay
//   OVERLAY_UI  (43) — interactive chips/popups on top of an overlay
//   TOPMOST     (50) — popovers, palettes, modal content, toolbars

export const Z = {
  FAB: 30,
  OVERLAY: 40,
  OVERLAY_SVG: 41,
  OVERLAY_UI: 43,
  TOPMOST: 50,
} as const;
