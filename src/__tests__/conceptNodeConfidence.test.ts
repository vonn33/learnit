import { describe, it, expect } from 'vitest';
import { confidenceClass } from '@/components/map/ConceptNode';

describe('confidenceClass', () => {
  it('returns red classes for uncertain', () => {
    expect(confidenceClass('uncertain')).toBe('border-red-500/70 shadow-red-500/20 shadow-sm');
  });

  it('returns amber classes for familiar', () => {
    expect(confidenceClass('familiar')).toBe('border-amber-500/70 shadow-amber-500/20 shadow-sm');
  });

  it('returns green classes for mastered', () => {
    expect(confidenceClass('mastered')).toBe('border-green-500/70 shadow-green-500/20 shadow-sm');
  });

  it('returns empty string when unset', () => {
    expect(confidenceClass(undefined)).toBe('');
    expect(confidenceClass('')).toBe('');
  });
});
