import {useEffect} from 'react';
import {useReaderStore, type FontFace, type FontSize, type FontWeight, type LineSpacing, type ReadingWidth} from '@/store/readerStore';

const FONT_FACE_STACK: Record<FontFace, string> = {
  'newsreader': '"Newsreader", "Iowan Old Style", "Georgia", serif',
  'iowan': '"Iowan Old Style", "Georgia", serif',
  'recursive-sans': '"Recursive", ui-sans-serif, system-ui, -apple-system, sans-serif',
};

const SIZE_VAR: Record<FontSize, string> = {
  xs: '0.875rem',
  s: '0.95rem',
  m: '1.0625rem',
  l: '1.1875rem',
  xl: '1.3125rem',
};

const WEIGHT_VAR: Record<FontWeight, string> = {
  light: '360',
  regular: '420',
  medium: '480',
};

const LINE_HEIGHT_VAR: Record<LineSpacing, string> = {
  tight: '1.45',
  normal: '1.7',
  loose: '1.9',
};

const MEASURE_VAR: Record<ReadingWidth, string> = {
  narrow: '60ch',
  medium: '68ch',
  wide: '84ch',
};

export function ReaderPrefsApplier(): null {
  const fontFace = useReaderStore((s) => s.fontFace);
  const fontSize = useReaderStore((s) => s.fontSize);
  const fontWeight = useReaderStore((s) => s.fontWeight);
  const lineSpacing = useReaderStore((s) => s.lineSpacing);
  const readingWidth = useReaderStore((s) => s.readingWidth);
  const paperTint = useReaderStore((s) => s.paperTint);
  const justify = useReaderStore((s) => s.justify);
  const hyphenate = useReaderStore((s) => s.hyphenate);

  useEffect(() => {
    const html = document.documentElement;
    html.style.setProperty('--reader-font-prose', FONT_FACE_STACK[fontFace]);
    html.style.setProperty('--reader-base-size', SIZE_VAR[fontSize]);
    html.style.setProperty('--reader-prose-weight', WEIGHT_VAR[fontWeight]);
    html.style.setProperty('--reader-line-height', LINE_HEIGHT_VAR[lineSpacing]);
    html.style.setProperty('--reader-measure', MEASURE_VAR[readingWidth]);
    if (paperTint === 'default') html.removeAttribute('data-tint');
    else html.setAttribute('data-tint', paperTint);
    html.classList.toggle('reader-justify', justify);
    html.classList.toggle('reader-hyphenate', hyphenate);
  }, [fontFace, fontSize, fontWeight, lineSpacing, readingWidth, paperTint, justify, hyphenate]);

  return null;
}
