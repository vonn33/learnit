import { describe, it, expect, beforeEach } from 'vitest';
import { pickValidSelection } from '@/lib/useTextSelection';

function makeContainer(html: string): HTMLElement {
  const div = document.createElement('div');
  div.className = 'prose';
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

function makeSelection(node: Node, start: number, end: number): Selection {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  return sel;
}

describe('pickValidSelection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns null for collapsed selection', () => {
    const c = makeContainer('hello world');
    const sel = makeSelection(c.firstChild!, 3, 3);
    expect(pickValidSelection(sel, '.prose', 3)).toBeNull();
  });

  it('returns null when selection text is shorter than minLength', () => {
    const c = makeContainer('hello world');
    const sel = makeSelection(c.firstChild!, 0, 2);
    expect(pickValidSelection(sel, '.prose', 3)).toBeNull();
  });

  it('returns null when selection is outside the container', () => {
    makeContainer('inside container');
    const outside = document.createElement('p');
    outside.textContent = 'outside text here';
    document.body.appendChild(outside);
    const sel = makeSelection(outside.firstChild!, 0, 7);
    expect(pickValidSelection(sel, '.prose', 3)).toBeNull();
  });

  it('returns SelectionState for a valid selection inside container', () => {
    const c = makeContainer('the quick brown fox');
    const sel = makeSelection(c.firstChild!, 4, 9);
    const result = pickValidSelection(sel, '.prose', 3);
    expect(result).not.toBeNull();
    expect(result!.text).toBe('quick');
    expect(result!.savedRange).toBeInstanceOf(Range);
  });
});
