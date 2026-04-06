import {v4 as uuidv4} from 'uuid';
import {type Highlight, getHighlights, saveHighlights} from './storage';

// ── CRUD ──

export function createHighlight(
  data: Omit<Highlight, 'id' | 'createdAt'>,
): Highlight {
  const highlight: Highlight = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  const all = getHighlights();
  saveHighlights([...all, highlight]);
  return highlight;
}

export function updateHighlight(
  id: string,
  patch: Partial<Pick<Highlight, 'note' | 'connectionUrl' | 'tagIds'>>,
): void {
  const all = getHighlights().map((h) =>
    h.id === id ? {...h, ...patch} : h,
  );
  saveHighlights(all);
}

export function deleteHighlight(id: string): void {
  saveHighlights(getHighlights().filter((h) => h.id !== id));
}

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

  // Find start/end within the parent's text
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
 * Given a page URL, for each highlight on that page apply a <mark>-like span
 * wrapping the selected text. Uses fuzzy context matching to locate text
 * in the rendered DOM.
 */
export function applyHighlightsToDOM(
  highlights: Highlight[],
  container: HTMLElement,
  tags: import('./storage').Tag[] = [],
): void {
  for (const hl of highlights) {
    try {
      applyOneHighlight(hl, container, tags);
    } catch {
      // Never crash the page — just skip unanchorable highlights
    }
  }
}

function applyOneHighlight(
  hl: Highlight,
  container: HTMLElement,
  tags: import('./storage').Tag[] = [],
): void {
  const {selectedText, anchorContext} = hl;
  if (!selectedText) return;

  // Try exact text match within container
  const parts = anchorContext.split('|||');
  const contextSelected = parts[1] ?? selectedText;

  // Walk all text nodes and find the first occurrence of selectedText
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;

  while (node) {
    const idx = node.textContent?.indexOf(contextSelected) ?? -1;
    if (idx !== -1) {
      // Found — wrap with span
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + contextSelected.length);

      const {bg, border} = getHighlightColorForTags(hl.tagIds, tags);
      const mark = document.createElement('mark');
      mark.className = 'handbook-highlight';
      mark.dataset.highlightId = hl.id;
      mark.dataset.annotationId = hl.id;
      mark.style.backgroundColor = bg;
      mark.style.borderBottom = `2px solid ${border}`;
      mark.style.background = bg;

      try {
        range.surroundContents(mark);
      } catch {
        // Range crosses element boundaries — use extractContents + insertNode
        const fragment = range.extractContents();
        mark.appendChild(fragment);
        range.insertNode(mark);
      }
      return; // Apply each highlight once
    }
    node = walker.nextNode() as Text | null;
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
