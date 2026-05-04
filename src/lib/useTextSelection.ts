export type SelectionState = {
  text: string;
  savedRange: Range;
  selectionRect: DOMRect;
};

export function pickValidSelection(
  sel: Selection | null,
  containerSelector: string,
  minLength: number,
): SelectionState | null {
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const text = sel.toString().trim();
  if (text.length < minLength) return null;
  const anchor = sel.anchorNode;
  const el =
    anchor?.nodeType === Node.TEXT_NODE
      ? (anchor as Text).parentElement
      : (anchor as Element | null);
  if (!el?.closest(containerSelector)) return null;
  const range = sel.getRangeAt(0);
  return {
    text,
    savedRange: range.cloneRange(),
    selectionRect: range.getBoundingClientRect(),
  };
}
