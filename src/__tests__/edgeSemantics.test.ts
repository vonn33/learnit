import { describe, it, expect } from 'vitest';
import { MarkerType } from '@xyflow/react';
import { edgeStyle } from '@/components/map/MapCanvas';

describe('edgeStyle', () => {
  it('causes → orange, solid, ArrowClosed', () => {
    const s = edgeStyle('causes');
    expect(s.stroke).toBe('#f97316');
    expect(s.strokeDasharray).toBeUndefined();
    expect(s.markerType).toBe(MarkerType.ArrowClosed);
  });

  it('supports → green, solid, ArrowClosed', () => {
    const s = edgeStyle('supports');
    expect(s.stroke).toBe('#22c55e');
    expect(s.strokeDasharray).toBeUndefined();
    expect(s.markerType).toBe(MarkerType.ArrowClosed);
  });

  it('contradicts → red, dashed 6,3, ArrowClosed', () => {
    const s = edgeStyle('contradicts');
    expect(s.stroke).toBe('#ef4444');
    expect(s.strokeDasharray).toBe('6,3');
    expect(s.markerType).toBe(MarkerType.ArrowClosed);
  });

  it('is-a → purple, solid, Arrow (open)', () => {
    const s = edgeStyle('is-a');
    expect(s.stroke).toBe('#a78bfa');
    expect(s.strokeDasharray).toBeUndefined();
    expect(s.markerType).toBe(MarkerType.Arrow);
  });

  it('undefined → gray, dashed 3,3, ArrowClosed (untyped default)', () => {
    const s = edgeStyle(undefined);
    expect(s.stroke).toBe('#334155');
    expect(s.strokeDasharray).toBe('3,3');
    expect(s.markerType).toBe(MarkerType.ArrowClosed);
  });
});
