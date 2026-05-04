import { useEffect, type RefObject } from 'react';

interface Options {
  // Defer arming until the next event-loop tick. Use when the same click
  // that opened the popover would otherwise dismiss it.
  deferArm?: boolean;
}

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onOutside: () => void,
  { deferArm = false }: Options = {},
): void {
  useEffect(() => {
    let armed = !deferArm;
    const armTimer = deferArm ? window.setTimeout(() => { armed = true; }, 0) : null;

    function handler(e: MouseEvent) {
      if (!armed) return;
      const node = ref.current;
      if (node && !node.contains(e.target as Node)) onOutside();
    }

    document.addEventListener('mousedown', handler);
    return () => {
      if (armTimer !== null) window.clearTimeout(armTimer);
      document.removeEventListener('mousedown', handler);
    };
  }, [ref, onOutside, deferArm]);
}
