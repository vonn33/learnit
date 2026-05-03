import {type Annotation} from '@/store/annotationStore';

// ── Anchor context ──

const CONTEXT_CHARS = 40;

/**
 * Build an anchor context string from a Range: 40-char prefix + selected text + 40-char suffix.
 * Used for fuzzy re-anchoring if character offsets shift after content edits.
 */
export function buildAnchorContext(range: Range): string {
  const container = range.commonAncestorContainer;
  const parent =
    container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element);
  const fullText = parent?.textContent ?? '';

  let charStart = 0;
  let charEnd = 0;

  const walker = document.createTreeWalker(
    parent ?? document.body,
    NodeFilter.SHOW_TEXT,
  );
  let offset = 0;
  let node = walker.nextNode();
  while (node) {
    if (node === range.startContainer) {
      charStart = offset + range.startOffset;
    }
    if (node === range.endContainer) {
      charEnd = offset + range.endOffset;
      break;
    }
    offset += node.textContent?.length ?? 0;
    node = walker.nextNode();
  }

  const prefix = fullText.slice(Math.max(0, charStart - CONTEXT_CHARS), charStart);
  const selected = fullText.slice(charStart, charEnd);
  const suffix = fullText.slice(charEnd, charEnd + CONTEXT_CHARS);

  return `${prefix}|||${selected}|||${suffix}`;
}

/**
 * For each annotation, apply a <mark> wrapping the selected text using fuzzy context matching.
 */
export function applyHighlightsToDOM(
  annotations: Annotation[],
  container: HTMLElement,
  tags: import('./storage').Tag[] = [],
): void {
  for (const annotation of annotations) {
    try {
      applyOneHighlight(annotation, container, tags);
    } catch {
      // Never crash the page — just skip unanchorable annotations
    }
  }
}

function resolveAnchorOffset(container: HTMLElement, selected: string, prefix: string): number {
  const fullText = container.textContent ?? '';
  // Try to find prefix+selected together — disambiguates repeated text
  if (prefix) {
    const needle = prefix + selected;
    const pos = fullText.indexOf(needle);
    if (pos !== -1) return pos + prefix.length;
  }
  // Fallback: first occurrence
  return fullText.indexOf(selected);
}

function textNodeAtOffset(
  container: HTMLElement,
  charOffset: number,
): {node: Text; offset: number} | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let accumulated = 0;
  let node = walker.nextNode() as Text | null;
  while (node) {
    const len = node.textContent?.length ?? 0;
    if (accumulated + len > charOffset) {
      return {node, offset: charOffset - accumulated};
    }
    accumulated += len;
    node = walker.nextNode() as Text | null;
  }
  return null;
}

function applyOneHighlight(
  hl: Annotation,
  container: HTMLElement,
  tags: import('./storage').Tag[] = [],
): void {
  const {text: selectedText, anchorContext} = hl;
  if (!selectedText) return;

  const parts = anchorContext.split('|||');
  const prefix = parts[0] ?? '';
  const contextSelected = parts[1] ?? selectedText;

  const startCharOffset = resolveAnchorOffset(container, contextSelected, prefix);
  if (startCharOffset === -1) return;

  const startPos = textNodeAtOffset(container, startCharOffset);
  const endPos = textNodeAtOffset(container, startCharOffset + contextSelected.length);
  if (!startPos || !endPos) return;

  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);

  const {bg, border} = getHighlightColorForTags(hl.tagIds, tags);
  const mark = document.createElement('mark');
  mark.className = 'handbook-highlight';
  mark.dataset.highlightId = hl.id;
  mark.dataset.annotationId = hl.id;
  mark.style.borderBottom = `2px solid ${border}`;
  mark.style.background = bg;

  try {
    range.surroundContents(mark);
  } catch {
    const fragment = range.extractContents();
    mark.appendChild(fragment);
    range.insertNode(mark);
  }

  if (hl.note) {
    const dot = document.createElement('span');
    dot.className = 'handbook-note-dot';
    dot.dataset.highlightId = hl.id;
    dot.style.background = border;
    mark.insertAdjacentElement('afterend', dot);
  }
}

export function removeHighlightFromDOM(id: string): void {
  const mark = document.querySelector(`mark[data-highlight-id="${id}"]`);
  if (mark) {
    const parent = mark.parentNode;
    while (mark.firstChild) {
      parent?.insertBefore(mark.firstChild, mark);
    }
    parent?.removeChild(mark);
    parent?.normalize();
  }
}

// ── Colour helpers ──

const DEFAULT_COLOR = 'rgba(250, 204, 21, 0.35)';
const DEFAULT_BORDER = 'rgba(234, 179, 8, 0.8)';

export function getHighlightColorForTags(
  tagIds: string[],
  tags: import('./storage').Tag[],
): {bg: string; border: string} {
  if (tagIds.length === 0) return {bg: DEFAULT_COLOR, border: DEFAULT_BORDER};
  const tag = tags.find((t) => t.id === tagIds[0]);
  if (!tag) return {bg: DEFAULT_COLOR, border: DEFAULT_BORDER};
  return {
    bg: hexToRgba(tag.color, 0.35),
    border: hexToRgba(tag.color, 0.8),
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(250, 204, 21, ${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
