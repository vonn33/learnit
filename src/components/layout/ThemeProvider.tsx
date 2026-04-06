import {useEffect} from 'react';
import {useHandbookStore} from '@/store';

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const theme = useHandbookStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (dark: boolean) => {
      root.classList.toggle('dark', dark);
      root.classList.toggle('light', !dark);
    };

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme]);

  return <>{children}</>;
}
