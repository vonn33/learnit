import { describe, it, expect } from 'vitest';
import { extractToc } from '@/lib/mdParser';

describe('extractToc', () => {
  it('returns empty array for empty input', () => {
    expect(extractToc('')).toEqual([]);
  });

  it('extracts a single H1', () => {
    const md = '# Title\n\nbody';
    expect(extractToc(md)).toEqual([
      { level: 1, text: 'Title', slug: 'title' },
    ]);
  });

  it('extracts mixed levels', () => {
    const md = '# A\n\n## B\n\n### C\n\n## D';
    expect(extractToc(md)).toEqual([
      { level: 1, text: 'A', slug: 'a' },
      { level: 2, text: 'B', slug: 'b' },
      { level: 3, text: 'C', slug: 'c' },
      { level: 2, text: 'D', slug: 'd' },
    ]);
  });

  it('ignores headings inside code fences', () => {
    const md = '# Real\n\n```\n# Fake\n```\n\n## Real Two';
    expect(extractToc(md)).toEqual([
      { level: 1, text: 'Real', slug: 'real' },
      { level: 2, text: 'Real Two', slug: 'real-two' },
    ]);
  });

  it('slugifies special characters', () => {
    const md = '# Hello, World! How are you?';
    expect(extractToc(md)).toEqual([
      { level: 1, text: 'Hello, World! How are you?', slug: 'hello-world-how-are-you' },
    ]);
  });
});
