import {describe, it, expect, beforeEach} from 'vitest';
import {useReaderStore, READER_DEFAULTS} from '@/store/readerStore';

describe('readerStore', () => {
  beforeEach(() => {
    useReaderStore.getState().reset();
    localStorage.removeItem('learnit-reader');
  });

  it('exposes the documented defaults', () => {
    const s = useReaderStore.getState();
    expect(s.fontFace).toBe('newsreader');
    expect(s.fontSize).toBe('m');
    expect(s.fontWeight).toBe('regular');
    expect(s.lineSpacing).toBe('normal');
    expect(s.readingWidth).toBe('medium');
    expect(s.paperTint).toBe('default');
    expect(s.justify).toBe(false);
    expect(s.hyphenate).toBe(false);
  });

  it('setFontFace updates state', () => {
    useReaderStore.getState().setFontFace('iowan');
    expect(useReaderStore.getState().fontFace).toBe('iowan');
  });

  it('setFontSize updates state', () => {
    useReaderStore.getState().setFontSize('xl');
    expect(useReaderStore.getState().fontSize).toBe('xl');
  });

  it('bumpFontSize(+1) walks up the scale', () => {
    useReaderStore.getState().setFontSize('m');
    useReaderStore.getState().bumpFontSize(1);
    expect(useReaderStore.getState().fontSize).toBe('l');
  });

  it('bumpFontSize(-1) walks down the scale', () => {
    useReaderStore.getState().setFontSize('m');
    useReaderStore.getState().bumpFontSize(-1);
    expect(useReaderStore.getState().fontSize).toBe('s');
  });

  it('bumpFontSize clamps at xs low end', () => {
    useReaderStore.getState().setFontSize('xs');
    useReaderStore.getState().bumpFontSize(-1);
    expect(useReaderStore.getState().fontSize).toBe('xs');
  });

  it('bumpFontSize clamps at xl high end', () => {
    useReaderStore.getState().setFontSize('xl');
    useReaderStore.getState().bumpFontSize(1);
    expect(useReaderStore.getState().fontSize).toBe('xl');
  });

  it('toggle setters work for justify and hyphenate', () => {
    useReaderStore.getState().setJustify(true);
    expect(useReaderStore.getState().justify).toBe(true);
    useReaderStore.getState().setHyphenate(true);
    expect(useReaderStore.getState().hyphenate).toBe(true);
  });

  it('reset returns all values to defaults', () => {
    const s = useReaderStore.getState();
    s.setFontFace('recursive-sans');
    s.setFontSize('xl');
    s.setJustify(true);
    s.reset();
    const after = useReaderStore.getState();
    expect(after.fontFace).toBe(READER_DEFAULTS.fontFace);
    expect(after.fontSize).toBe(READER_DEFAULTS.fontSize);
    expect(after.justify).toBe(READER_DEFAULTS.justify);
  });
});
