import { describe, it, expect } from 'vitest';
import { generateScaffold } from '@/lib/mapScaffold';

const manifest = {
  'language-learning': {
    label: 'Language Learning',
    link: 'language-learning/index',
    sections: {
      'quick-references': {
        label: 'Quick References',
        link: 'language-learning/quick-references/index',
        docs: ['fluent-forever', 'nation'],
      },
      handbook: {
        label: 'Two Maps, One Territory',
        link: 'language-learning/handbook/index',
        docs: ['part-1a-fluent-forever', 'part-1b-nation', 'part-2-head-to-head'],
      },
    },
  },
};

describe('generateScaffold', () => {
  it('generates structural nodes for a category', () => {
    const scaffold = generateScaffold(manifest, 'language-learning');
    expect(scaffold.length).toBeGreaterThan(0);
    expect(scaffold.every((n) => n.type === 'structural')).toBe(true);
  });

  it('includes section labels and doc slugs', () => {
    const scaffold = generateScaffold(manifest, 'language-learning');
    const labels = scaffold.map((n) => n.label);
    expect(labels).toContain('Quick References');
    expect(labels).toContain('Two Maps, One Territory');
    expect(labels).toContain('fluent-forever');
    expect(labels).toContain('nation');
    expect(labels).toContain('part-1a-fluent-forever');
  });

  it('returns empty array for unknown category', () => {
    const scaffold = generateScaffold(manifest, 'nonexistent');
    expect(scaffold).toEqual([]);
  });
});
