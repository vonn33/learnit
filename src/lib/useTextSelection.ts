import { useCallback, useEffect, useRef, useState } from 'react';

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

interface Options {
  containerSelector: string;
  minLength?: number;
  trigger: 'pointer' | 'touch';
}

export function useTextSelection({
  containerSelector,
  minLength = 3,
  trigger,
}: Options): {
  selection: SelectionState | null;
  clear: () => void;
} {
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const evaluate = useCallback(() => {
    const active = document.activeElement;
    if (active?.closest('[data-highlight-popover="true"]')) return;
    const next = pickValidSelection(window.getSelection(), containerSelector, minLength);
    setSelection(next);
  }, [containerSelector, minLength]);

  useEffect(() => {
    if (trigger !== 'pointer') return;
    function onSelectionChange() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(evaluate, 80);
    }
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trigger, evaluate]);

  const clear = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  return { selection, clear };
}
