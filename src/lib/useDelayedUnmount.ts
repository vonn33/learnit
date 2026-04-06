import {useEffect, useState} from 'react';

/**
 * Returns true while visible is true AND for delayMs after it becomes false.
 * Lets exit animations finish before the component unmounts.
 */
export function useDelayedUnmount(visible: boolean, delayMs: number): boolean {
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), delayMs);
      return () => clearTimeout(timer);
    }
  }, [visible, delayMs]);

  return shouldRender;
}
