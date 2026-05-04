import { useEffect, type RefObject } from 'react';

interface Options {
  // Defer arming until the next event-loop tick. Use when the same click/tap
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

    function handler(e: MouseEvent | TouchEvent) {
      if (!armed) return;
      const node = ref.current;
      const target =
        'touches' in e
          ? (e.touches[0]?.target as Node | undefined) ?? (e.target as Node | null)
          : (e.target as Node | null);
      if (node && target && !node.contains(target)) onOutside();
    }

    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      if (armTimer !== null) window.clearTimeout(armTimer);
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [ref, onOutside, deferArm]);
}
