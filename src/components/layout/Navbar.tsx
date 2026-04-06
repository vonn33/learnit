import {Link, useLocation} from 'react-router';
import {Sun, Moon, Monitor, BookOpen, Tag, GitBranch, Settings, Search} from 'lucide-react';
import {useHandbookStore} from '@/store';

type Theme = 'dark' | 'light' | 'system';

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  dark: <Moon size={15} />,
  light: <Sun size={15} />,
  system: <Monitor size={15} />,
};

export function Navbar({onSearchOpen}: {onSearchOpen: () => void}) {
  const {theme, setTheme} = useHandbookStore();
  const location = useLocation();

  function cycleTheme() {
    const order: Theme[] = ['dark', 'light', 'system'];
    const next = order[(order.indexOf(theme as Theme) + 1) % order.length];
    setTheme(next);
  }

  const navLinks = [
    {to: '/highlights', icon: <Tag size={15} />, label: 'Highlights'},
    {to: '/diagrams', icon: <GitBranch size={15} />, label: 'Diagrams'},
    {to: '/settings', icon: <Settings size={15} />, label: 'Settings'},
  ];

  return (
    <header className="h-12 border-b flex items-center px-4 gap-3 shrink-0 bg-[var(--color-card)]">
      <Link
        to="/"
        className="flex items-center gap-2 font-semibold text-sm mr-2 text-[var(--color-foreground)] no-underline"
      >
        <BookOpen size={16} />
        LearnIt
      </Link>

      <div className="flex-1" />

      <button
        onClick={onSearchOpen}
        className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)] bg-[var(--color-muted)] hover:bg-[var(--color-accent)] border rounded px-2.5 py-1.5 transition-colors"
        aria-label="Open search"
      >
        <Search size={13} />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline text-[10px] opacity-60">⌘K</kbd>
      </button>

      <nav className="flex items-center gap-1">
        {navLinks.map(({to, icon, label}) => (
          <Link
            key={to}
            to={to}
            className={[
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors no-underline',
              location.pathname.startsWith(to)
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]',
            ].join(' ')}
          >
            {icon}
            <span className="hidden md:inline">{label}</span>
          </Link>
        ))}
      </nav>

      <button
        onClick={cycleTheme}
        className="p-1.5 rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors"
        aria-label={`Theme: ${theme}`}
        title={`Theme: ${theme}`}
      >
        {THEME_ICONS[theme as Theme] ?? THEME_ICONS.dark}
      </button>
    </header>
  );
}
