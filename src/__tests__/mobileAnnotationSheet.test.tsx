import {describe, it, expect, beforeEach, vi} from 'vitest';
import {act, render, screen, fireEvent} from '@testing-library/react';
import {MobileAnnotationSheet} from '@/components/reader/MobileAnnotationSheet';
import {useAnnotationStore} from '@/store/annotationStore';
import {useTagStore} from '@/store/tagStore';

function selectInProse(text: string) {
  const article = document.createElement('article');
  article.className = 'prose';
  article.textContent = `prefix ${text} suffix`;
  document.body.appendChild(article);
  const node = article.firstChild!;
  const start = (article.textContent ?? '').indexOf(text);
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, start + text.length);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
  act(() => {
    document.dispatchEvent(new Event('touchend'));
  });
}

beforeEach(() => {
  document.body.innerHTML = '';
  window.getSelection()?.removeAllRanges();
  useAnnotationStore.setState({annotations: [], showAnnotations: true});
  useTagStore.setState({
    tags: [
      {id: 't1', name: 'Key point', color: '#facc15'},
      {id: 't2', name: 'Question', color: '#60a5fa'},
    ],
  });
});

describe('MobileAnnotationSheet', () => {
  it('renders nothing when there is no selection', () => {
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    expect(screen.queryByRole('dialog', {name: /annotate/i})).toBeNull();
  });

  it('renders sheet with selected text after touchend', async () => {
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    selectInProse('quick brown fox');
    const dialog = await screen.findByRole('dialog', {name: /annotate/i});
    expect(dialog).toBeInTheDocument();
    // Query within the dialog so the article.prose backdrop doesn't cause duplicate-match errors
    const {getByText} = require('@testing-library/dom');
    expect(getByText(dialog, /quick brown fox/)).toBeInTheDocument();
  });

  it('renders tag pills from tag store', async () => {
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    selectInProse('quick brown fox');
    await screen.findByRole('dialog', {name: /annotate/i});
    expect(screen.getByRole('button', {name: /key point/i})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /question/i})).toBeInTheDocument();
  });

  it('Highlight button dispatches addAnnotation', async () => {
    const spy = vi.spyOn(useAnnotationStore.getState(), 'addAnnotation')
      .mockResolvedValue('new-id');
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    selectInProse('quick brown fox');
    await screen.findByRole('dialog', {name: /annotate/i});
    fireEvent.click(screen.getByRole('button', {name: /^highlight$/i}));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'highlight',
      docId: 'doc-1',
      text: 'quick brown fox',
      tagIds: [],
      note: '',
    }));
  });

  it('tag pill toggles selectedTagId; Highlight then includes tag', async () => {
    const spy = vi.spyOn(useAnnotationStore.getState(), 'addAnnotation')
      .mockResolvedValue('new-id');
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    selectInProse('quick brown fox');
    await screen.findByRole('dialog', {name: /annotate/i});
    fireEvent.click(screen.getByRole('button', {name: /key point/i}));
    fireEvent.click(screen.getByRole('button', {name: /^highlight$/i}));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({tagIds: ['t1']}));
  });
});
