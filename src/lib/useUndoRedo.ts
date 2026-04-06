import {useCallback, useRef, useState} from 'react';

export function useUndoRedo<T>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setState((prev) => {
      const nextVal = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      past.current = [...past.current, prev];
      future.current = [];
      return nextVal;
    });
  }, []);

  const undo = useCallback(() => {
    setState((prev) => {
      if (past.current.length === 0) return prev;
      const previous = past.current[past.current.length - 1];
      past.current = past.current.slice(0, -1);
      future.current = [prev, ...future.current];
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      if (future.current.length === 0) return prev;
      const next = future.current[0];
      future.current = future.current.slice(1);
      past.current = [...past.current, prev];
      return next;
    });
  }, []);

  return {
    state,
    set,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
