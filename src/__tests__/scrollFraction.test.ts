import {describe, it, expect} from 'vitest';
import {computeScrollFraction} from '@/lib/scrollFraction';

describe('computeScrollFraction', () => {
  it('returns 0 when not scrolled', () => {
    expect(computeScrollFraction({scrollY: 0, scrollHeight: 2000, viewportHeight: 800})).toBe(0);
  });

  it('returns 1 when scrolled to bottom', () => {
    expect(computeScrollFraction({scrollY: 1200, scrollHeight: 2000, viewportHeight: 800})).toBe(1);
  });

  it('returns 0.5 at midpoint', () => {
    expect(computeScrollFraction({scrollY: 600, scrollHeight: 2000, viewportHeight: 800})).toBe(0.5);
  });

  it('returns 0 when content fits viewport (no scroll possible)', () => {
    expect(computeScrollFraction({scrollY: 0, scrollHeight: 800, viewportHeight: 800})).toBe(0);
  });

  it('clamps to [0, 1] for out-of-range scrollY', () => {
    expect(computeScrollFraction({scrollY: -50, scrollHeight: 2000, viewportHeight: 800})).toBe(0);
    expect(computeScrollFraction({scrollY: 99999, scrollHeight: 2000, viewportHeight: 800})).toBe(1);
  });
});
