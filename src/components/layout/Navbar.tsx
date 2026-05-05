import {Link, useLocation} from 'react-router';
import {Tag, GitBranch, Settings, Search, Library} from 'lucide-react';
import {QuickSettingsPopover} from '@/components/ui/QuickSettingsPopover';

export function Navbar({onSearchOpen}: {onSearchOpen: () => void}) {
  const location = useLocation();

  const navLinks = [
    {to: '/manage', icon: <Library size={13} />, label: 'Library'},
    {to: '/annotations', icon: <Tag size={13} />, label: 'Margins'},
    {to: '/diagrams', icon: <GitBranch size={13} />, label: 'Diagrams'},
    {to: '/settings', icon: <Settings size={13} />, label: 'Settings'},
  ];

  return (
    <header className="sticky top-0 z-[20] h-14 shrink-0 bg-[var(--color-card)] flex items-center px-5 gap-4 border-b border-[var(--color-rule)]">
      {/* Top hairline ornament — like a book's headband */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/45 to-transparent"
      />

      <Link
        to="/"
        className="group flex items-baseline gap-2 mr-1 no-underline select-none"
      >
        <span
          aria-hidden
          className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] translate-y-[-1px] transition-transform group-hover:scale-125"
        />
        <span
          className="font-display text-[1.35rem] leading-none text-[var(--color-ink)] italic"
          style={{fontVariationSettings: '"opsz" 96, "SOFT" 80, "wght" 460'}}
        >
          LearnIt
        </span>
      </Link>

      <div className="flex-1" />

      <button
        onClick={onSearchOpen}
        className="group flex items-center gap-2 text-[11px] text-[var(--color-muted-foreground)] bg-[var(--color-vellum)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] border border-[var(--color-border)] rounded-md px-3 py-1.5 transition-colors"
        aria-label="Open search"
      >
        <Search size={12} className="opacity-70 group-hover:opacity-100" />
        <span className="hidden sm:inline smallcaps tracking-[0.08em]">Search</span>
        <kbd className="hidden sm:inline font-mono text-[10px] opacity-55 ml-1">⌘K</kbd>
      </button>

      <nav className="flex items-center gap-0.5">
        {navLinks.map(({to, icon, label}) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={[
                'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] smallcaps tracking-[0.08em] transition-colors no-underline',
                active
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              ].join(' ')}
            >
              {icon}
              <span className="hidden md:inline">{label}</span>
              {active && (
                <span
                  aria-hidden
                  className="absolute left-2.5 right-2.5 -bottom-[3px] h-px bg-[var(--color-primary)]"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <span aria-hidden className="hidden md:block w-px h-5 bg-[var(--color-border)] mx-1" />

      <QuickSettingsPopover />
    </header>
  );
}
