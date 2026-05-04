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

describe('MobileAnnotationSheet — note mode', () => {
  it('tapping pencil reveals note input and Save button', async () => {
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    selectInProse('quick brown fox');
    await screen.findByRole('dialog', {name: /annotate/i});
    fireEvent.click(screen.getByRole('button', {name: /add note/i}));
    expect(screen.getByPlaceholderText(/add a note/i)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /save highlight/i})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /^highlight$/i})).toBeNull();
  });

  it('typing then Save dispatches addAnnotation with note text', async () => {
    const spy = vi.spyOn(useAnnotationStore.getState(), 'addAnnotation')
      .mockResolvedValue('new-id');
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    selectInProse('quick brown fox');
    await screen.findByRole('dialog', {name: /annotate/i});
    fireEvent.click(screen.getByRole('button', {name: /add note/i}));
    const input = screen.getByPlaceholderText(/add a note/i);
    fireEvent.change(input, {target: {value: 'pivotal moment'}});
    fireEvent.click(screen.getByRole('button', {name: /save highlight/i}));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'highlight',
      note: 'pivotal moment',
    }));
  });

  it('Enter in note input also saves', async () => {
    const spy = vi.spyOn(useAnnotationStore.getState(), 'addAnnotation')
      .mockResolvedValue('new-id');
    render(<MobileAnnotationSheet pageUrl="doc-1" />);
    selectInProse('quick brown fox');
    await screen.findByRole('dialog', {name: /annotate/i});
    fireEvent.click(screen.getByRole('button', {name: /add note/i}));
    const input = screen.getByPlaceholderText(/add a note/i);
    fireEvent.change(input, {target: {value: 'short'}});
    fireEvent.keyDown(input, {key: 'Enter'});
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({note: 'short'}));
  });
});
