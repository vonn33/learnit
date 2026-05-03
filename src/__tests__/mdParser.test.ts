import { describe, it, expect } from 'vitest';
import { extractToc, extractAbstract, countWords, extractTitle } from '@/lib/mdParser';

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

describe('extractAbstract', () => {
  it('returns empty string for empty input', () => {
    expect(extractAbstract('')).toBe('');
  });

  it('returns first paragraph after H1', () => {
    const md = '# Title\n\nFirst paragraph here.\n\nSecond paragraph.';
    expect(extractAbstract(md)).toBe('First paragraph here.');
  });

  it('returns first paragraph if no H1', () => {
    const md = 'First paragraph.\n\nSecond.';
    expect(extractAbstract(md)).toBe('First paragraph.');
  });

  it('skips frontmatter blocks', () => {
    const md = '---\ntitle: Foo\n---\n\n# Title\n\nReal abstract.';
    expect(extractAbstract(md)).toBe('Real abstract.');
  });

  it('joins multi-line paragraph into single line', () => {
    const md = '# Title\n\nLine one\nLine two\nLine three.\n\nNext para.';
    expect(extractAbstract(md)).toBe('Line one Line two Line three.');
  });
});

describe('countWords', () => {
  it('returns 0 for empty', () => {
    expect(countWords('')).toBe(0);
  });

  it('counts whitespace-separated tokens', () => {
    expect(countWords('one two three')).toBe(3);
  });

  it('strips markdown syntax before counting', () => {
    expect(countWords('# Title\n\n**bold** text and `code`.')).toBe(5);
  });
});

describe('extractTitle', () => {
  it('returns first H1', () => {
    expect(extractTitle('# Hello\n\nbody')).toBe('Hello');
  });

  it('falls back to filename when no H1', () => {
    expect(extractTitle('body only', 'my-file.md')).toBe('my-file');
  });

  it('returns empty when no H1 and no filename', () => {
    expect(extractTitle('body only')).toBe('');
  });
});
