import {create} from 'zustand';
import {persist} from 'zustand/middleware';

export type FontFace = 'newsreader' | 'iowan' | 'recursive-sans';
export type FontSize = 'xs' | 's' | 'm' | 'l' | 'xl';
export type FontWeight = 'light' | 'regular' | 'medium';
export type LineSpacing = 'tight' | 'normal' | 'loose';
export type ReadingWidth = 'narrow' | 'medium' | 'wide';
export type PaperTint = 'default' | 'vellum' | 'cream' | 'slate';

const SIZE_SCALE: FontSize[] = ['xs', 's', 'm', 'l', 'xl'];

interface ReaderState {
  fontFace: FontFace;
  fontSize: FontSize;
  fontWeight: FontWeight;
  lineSpacing: LineSpacing;
  readingWidth: ReadingWidth;
  paperTint: PaperTint;
  justify: boolean;
  hyphenate: boolean;
  setFontFace: (v: FontFace) => void;
  setFontSize: (v: FontSize) => void;
  bumpFontSize: (delta: 1 | -1) => void;
  setFontWeight: (v: FontWeight) => void;
  setLineSpacing: (v: LineSpacing) => void;
  setReadingWidth: (v: ReadingWidth) => void;
  setPaperTint: (v: PaperTint) => void;
  setJustify: (v: boolean) => void;
  setHyphenate: (v: boolean) => void;
  reset: () => void;
}

export const READER_DEFAULTS = {
  fontFace: 'newsreader' as FontFace,
  fontSize: 'm' as FontSize,
  fontWeight: 'regular' as FontWeight,
  lineSpacing: 'normal' as LineSpacing,
  readingWidth: 'medium' as ReadingWidth,
  paperTint: 'default' as PaperTint,
  justify: false,
  hyphenate: false,
};

export const useReaderStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      ...READER_DEFAULTS,
      setFontFace: (fontFace) => set({fontFace}),
      setFontSize: (fontSize) => set({fontSize}),
      bumpFontSize: (delta) => {
        const idx = SIZE_SCALE.indexOf(get().fontSize);
        const next = Math.max(0, Math.min(SIZE_SCALE.length - 1, idx + delta));
        set({fontSize: SIZE_SCALE[next]});
      },
      setFontWeight: (fontWeight) => set({fontWeight}),
      setLineSpacing: (lineSpacing) => set({lineSpacing}),
      setReadingWidth: (readingWidth) => set({readingWidth}),
      setPaperTint: (paperTint) => set({paperTint}),
      setJustify: (justify) => set({justify}),
      setHyphenate: (hyphenate) => set({hyphenate}),
      reset: () => set(READER_DEFAULTS),
    }),
    {name: 'learnit-reader'},
  ),
);
