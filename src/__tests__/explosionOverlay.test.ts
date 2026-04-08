import { describe, it, expect } from 'vitest';
import { radialPositions } from '@/components/map/ExplosionOverlay';

describe('radialPositions', () => {
  it('returns empty array for 0 children', () => {
    expect(radialPositions({ x: 100, y: 100 }, 120, 0)).toEqual([]);
  });

  it('places 1 child at top (270°)', () => {
    const [pos] = radialPositions({ x: 0, y: 0 }, 100, 1);
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(-100);
  });

  it('places 2 children at ±45° from top', () => {
    const positions = radialPositions({ x: 0, y: 0 }, 100, 2);
    expect(positions[0].x).toBe(-71);
    expect(positions[0].y).toBe(-71);
    expect(positions[1].x).toBe(71);
    expect(positions[1].y).toBe(-71);
  });

  it('places 4 children at 90° intervals starting from top', () => {
    const positions = radialPositions({ x: 0, y: 0 }, 100, 4);
    expect(positions[0]).toEqual({ x: 0, y: -100 });
    expect(positions[1]).toEqual({ x: 100, y: 0 });
    expect(positions[2]).toEqual({ x: 0, y: 100 });
    expect(positions[3]).toEqual({ x: -100, y: 0 });
  });
});
