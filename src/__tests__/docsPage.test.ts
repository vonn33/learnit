import {describe, it, expect, vi} from 'vitest';
import {getFirstDocPathForTopic} from '@/pages/DocsPage';

// vi.mock is hoisted by Vitest before imports resolve — same pattern as docNav.test.tsx
vi.mock('@/data/content-manifest.json', () => ({
  default: {
    'language-learning': {
      sections: {
        handbook: {docs: ['part-1a-fluent-forever', 'part-1b-vocab']},
        advanced: {docs: ['immersion']},
      },
    },
    'productivity': {
      sections: {
        'getting-started': {docs: ['intro']},
      },
    },
    'empty-topic': {
      sections: {
        'no-docs': {docs: []},
      },
    },
  },
}));

describe('getFirstDocPathForTopic', () => {
  it('returns path for first doc in first section of a known topic', () => {
    expect(getFirstDocPathForTopic('language-learning')).toBe(
      '/docs/language-learning/handbook/part-1a-fluent-forever',
    );
  });

  it('returns path for another known topic', () => {
    expect(getFirstDocPathForTopic('productivity')).toBe(
      '/docs/productivity/getting-started/intro',
    );
  });

  it('returns null for unknown topic', () => {
    expect(getFirstDocPathForTopic('nonexistent')).toBeNull();
  });

  it('returns null for topic with no docs in any section', () => {
    expect(getFirstDocPathForTopic('empty-topic')).toBeNull();
  });
});
