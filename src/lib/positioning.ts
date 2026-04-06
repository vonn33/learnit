/**
 * Viewport-aware popover positioning utility.
 * Replaces ad-hoc rect math scattered across HighlightPopover and NotePanel.
 */

export interface AnchorRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

export interface PopoverPosition {
  top: number;
  left: number;
  placement: 'above' | 'below';
}

export function clampToViewport({
  anchorRect,
  popoverWidth,
  popoverHeight,
  preferredPlacement = 'above',
  margin = 8,
}: {
  anchorRect: AnchorRect;
  popoverWidth: number;
  popoverHeight: number;
  preferredPlacement?: 'above' | 'below';
  margin?: number;
}): PopoverPosition {
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Centered horizontally over anchor, clamped to viewport edges
  let left = anchorRect.left + scrollX + anchorRect.width / 2 - popoverWidth / 2;
  left = Math.max(scrollX + margin, Math.min(left, scrollX + vw - popoverWidth - margin));

  // Flip vertical placement if preferred side has insufficient space
  const spaceAbove = anchorRect.top;
  const spaceBelow = vh - anchorRect.bottom;
  let placement: 'above' | 'below' = preferredPlacement;

  if (preferredPlacement === 'above' && spaceAbove < popoverHeight + margin) {
    placement = 'below';
  } else if (preferredPlacement === 'below' && spaceBelow < popoverHeight + margin) {
    placement = 'above';
  }

  const top =
    placement === 'above'
      ? anchorRect.top + scrollY - popoverHeight - margin
      : anchorRect.bottom + scrollY + margin;

  return {top, left, placement};
}
