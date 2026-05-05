import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {render, act} from '@testing-library/react';
import {ReaderPrefsApplier} from '@/components/reader/ReaderPrefsApplier';
import {useReaderStore} from '@/store/readerStore';

describe('ReaderPrefsApplier', () => {
  beforeEach(() => {
    useReaderStore.getState().reset();
    document.documentElement.removeAttribute('data-tint');
    document.documentElement.classList.remove('reader-justify', 'reader-hyphenate');
    document.documentElement.style.cssText = '';
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-tint');
    document.documentElement.classList.remove('reader-justify', 'reader-hyphenate');
    document.documentElement.style.cssText = '';
  });

  it('renders nothing', () => {
    const {container} = render(<ReaderPrefsApplier />);
    expect(container.firstChild).toBeNull();
  });

  it('writes default CSS vars on mount', () => {
    render(<ReaderPrefsApplier />);
    const html = document.documentElement;
    expect(html.style.getPropertyValue('--reader-base-size')).toContain('rem');
    expect(html.style.getPropertyValue('--reader-line-height')).toBe('1.7');
    expect(html.style.getPropertyValue('--reader-measure')).toBe('68ch');
    expect(html.style.getPropertyValue('--reader-prose-weight')).toBe('420');
    expect(html.style.getPropertyValue('--reader-font-prose')).toContain('Newsreader');
  });

  it('updates CSS vars when fontSize changes', () => {
    render(<ReaderPrefsApplier />);
    act(() => {
      useReaderStore.getState().setFontSize('xl');
    });
    expect(document.documentElement.style.getPropertyValue('--reader-base-size')).toBe('1.3125rem');
  });

  it('updates data-tint attribute on paperTint change', () => {
    render(<ReaderPrefsApplier />);
    act(() => {
      useReaderStore.getState().setPaperTint('vellum');
    });
    expect(document.documentElement.getAttribute('data-tint')).toBe('vellum');
    act(() => {
      useReaderStore.getState().setPaperTint('default');
    });
    expect(document.documentElement.getAttribute('data-tint')).toBeNull();
  });

  it('toggles reader-justify class', () => {
    render(<ReaderPrefsApplier />);
    act(() => {
      useReaderStore.getState().setJustify(true);
    });
    expect(document.documentElement.classList.contains('reader-justify')).toBe(true);
    act(() => {
      useReaderStore.getState().setJustify(false);
    });
    expect(document.documentElement.classList.contains('reader-justify')).toBe(false);
  });

  it('toggles reader-hyphenate class', () => {
    render(<ReaderPrefsApplier />);
    act(() => {
      useReaderStore.getState().setHyphenate(true);
    });
    expect(document.documentElement.classList.contains('reader-hyphenate')).toBe(true);
    act(() => {
      useReaderStore.getState().setHyphenate(false);
    });
    expect(document.documentElement.classList.contains('reader-hyphenate')).toBe(false);
  });
});
