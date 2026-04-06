import {create} from 'zustand';
import {persist} from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'system';

interface HandbookStore {
  theme: Theme;
  setTheme: (v: Theme) => void;
}

export const useHandbookStore = create<HandbookStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (v) => set({theme: v}),
    }),
    {
      name: 'handbook:ui',
    },
  ),
);
