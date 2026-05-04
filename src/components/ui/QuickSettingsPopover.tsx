import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router';
import {SlidersHorizontal, Sun, Moon, Monitor} from 'lucide-react';
import {useReaderStore, type PaperTint, type LineSpacing} from '@/store/readerStore';
import {useHandbookStore} from '@/store';
import {useClickOutside} from '@/lib/useClickOutside';
import {useBodyScrollLock} from '@/lib/useBodyScrollLock';
import {Z} from '@/lib/zIndex';

const TINTS: {value: PaperTint; label: string; swatch: string}[] = [
  {value: 'default', label: 'Default', swatch: 'var(--color-background)'},
  {value: 'vellum', label: 'Vellum', swatch: 'oklch(0.96 0.022 80)'},
  {value: 'cream', label: 'Cream', swatch: 'oklch(0.965 0.028 95)'},
  {value: 'slate', label: 'Slate', swatch: 'oklch(0.95 0.012 240)'},
];

const SPACINGS: LineSpacing[] = ['tight', 'normal', 'loose'];

export function QuickSettingsPopover() {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const theme = useHandbookStore((s) => s.theme);
  const setTheme = useHandbookStore((s) => s.setTheme);
  const paperTint = useReaderStore((s) => s.paperTint);
  const setPaperTint = useReaderStore((s) => s.setPaperTint);
  const fontSize = useReaderStore((s) => s.fontSize);
  const bumpFontSize = useReaderStore((s) => s.bumpFontSize);
  const lineSpacing = useReaderStore((s) => s.lineSpacing);
  const setLineSpacing = useReaderStore((s) => s.setLineSpacing);

  useClickOutside(popoverRef, () => setOpen(false), {deferArm: true});
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        aria-label="Quick settings"
        title="Quick settings"
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors"
      >
        <SlidersHorizontal size={14} />
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Quick settings"
          className="fixed top-14 right-4 w-[280px] max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--color-rule)] bg-[var(--color-card)] shadow-lg p-4 flex flex-col gap-4"
          style={{zIndex: Z.TOPMOST}}
        >
          {/* Theme */}
          <div>
            <div className="text-[11px] smallcaps tracking-[0.1em] text-[var(--color-muted-foreground)] mb-1.5">Theme</div>
            <div className="flex gap-1">
              {([
                ['light', <Sun size={13} />, 'Light'],
                ['dark', <Moon size={13} />, 'Dark'],
                ['system', <Monitor size={13} />, 'System'],
              ] as const).map(([value, icon, label]) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={[
                    'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] border transition-colors',
                    theme === value
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent'
                      : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                  ].join(' ')}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tint */}
          <div>
            <div className="text-[11px] smallcaps tracking-[0.1em] text-[var(--color-muted-foreground)] mb-1.5">Tint</div>
            <div className="flex gap-2">
              {TINTS.map((t) => (
                <button
                  key={t.value}
                  aria-label={t.label}
                  title={t.label}
                  onClick={() => setPaperTint(t.value)}
                  className={[
                    'flex-1 h-8 rounded-md border-2 transition-colors',
                    paperTint === t.value
                      ? 'border-[var(--color-primary)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-rule)]',
                  ].join(' ')}
                  style={{background: t.swatch}}
                />
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <div className="text-[11px] smallcaps tracking-[0.1em] text-[var(--color-muted-foreground)] mb-1.5">Size</div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Decrease size"
                onClick={() => bumpFontSize(-1)}
                disabled={fontSize === 'xs'}
                className="px-3 py-1.5 rounded-md border border-[var(--color-border)] text-sm hover:bg-[var(--color-accent)] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                A−
              </button>
              <span className="flex-1 text-center smallcaps text-[10px] tracking-[0.1em] text-[var(--color-muted-foreground)]">
                {fontSize.toUpperCase()}
              </span>
              <button
                aria-label="Increase size"
                onClick={() => bumpFontSize(1)}
                disabled={fontSize === 'xl'}
                className="px-3 py-1.5 rounded-md border border-[var(--color-border)] text-base hover:bg-[var(--color-accent)] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                A+
              </button>
            </div>
          </div>

          {/* Spacing */}
          <div>
            <div className="text-[11px] smallcaps tracking-[0.1em] text-[var(--color-muted-foreground)] mb-1.5">Spacing</div>
            <div className="flex gap-1">
              {SPACINGS.map((s) => (
                <button
                  key={s}
                  onClick={() => setLineSpacing(s)}
                  className={[
                    'flex-1 px-2 py-1.5 rounded-md text-[11px] border transition-colors capitalize',
                    lineSpacing === s
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent'
                      : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                  ].join(' ')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="text-[11px] smallcaps tracking-[0.1em] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] no-underline border-t border-[var(--color-rule)] pt-3 -mt-1 transition-colors"
          >
            Reading settings →
          </Link>
        </div>
      )}
    </>
  );
}
