import { useCallback, useRef } from 'react';

interface PaneHandleProps {
  onResize: (leftPercent: number) => void;
}

export function PaneHandle({ onResize }: PaneHandleProps) {
  const dragging = useRef(false);

  const handleMouseDown = useCallback(() => {
    dragging.current = true;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const container = document.getElementById('workspace-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(Math.max(percent, 20), 80);
      onResize(clamped);
    };

    const handleMouseUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onResize]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={handleMouseDown}
      className="w-1 cursor-col-resize bg-border hover:bg-primary/30 transition-colors shrink-0"
    />
  );
}
