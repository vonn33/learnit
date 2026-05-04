import {useRef, useState} from 'react';
import {useHandbookStore} from '@/store';
import {downloadExport, importData} from '@/lib/exportImport';
import {Sun, Moon, Monitor, Download, Upload, Trash2, BookOpen, Columns2, FileText, Network, Type, RotateCcw} from 'lucide-react';
import { useAnnotationStore } from '@/store/annotationStore';
import { useMapStore } from '@/store/mapStore';
import { useWorkspaceStore, type DefaultLayout } from '@/store/workspaceStore';
import { supabase } from '@/lib/supabase';
import {
  useReaderStore,
  type FontFace,
  type FontSize,
  type FontWeight,
  type LineSpacing,
  type ReadingWidth,
  type PaperTint,
} from '@/store/readerStore';

type Theme = 'dark' | 'light' | 'system';

const THEME_OPTIONS: {value: Theme; icon: React.ReactNode; label: string}[] = [
  {value: 'dark', icon: <Moon size={15} />, label: 'Dark'},
  {value: 'light', icon: <Sun size={15} />, label: 'Light'},
  {value: 'system', icon: <Monitor size={15} />, label: 'System'},
];

const LAYOUT_OPTIONS: {value: DefaultLayout; icon: React.ReactNode; label: string; desc: string}[] = [
  {value: 'split', icon: <Columns2 size={15} />, label: 'Split', desc: 'Reader and concept map side by side'},
  {value: 'reader-only', icon: <FileText size={15} />, label: 'Reader only', desc: 'Full-width reader, hide concept map'},
  {value: 'map-only', icon: <Network size={15} />, label: 'Map only', desc: 'Full-width concept map'},
];

const FONT_FACES: {value: FontFace; label: string}[] = [
  {value: 'newsreader', label: 'Newsreader'},
  {value: 'iowan', label: 'Iowan / Georgia'},
  {value: 'recursive-sans', label: 'Recursive Sans'},
];

const FONT_SIZES: FontSize[] = ['xs', 's', 'm', 'l', 'xl'];

const FONT_WEIGHTS: FontWeight[] = ['light', 'regular', 'medium'];

const LINE_SPACINGS: LineSpacing[] = ['tight', 'normal', 'loose'];

const READING_WIDTHS: ReadingWidth[] = ['narrow', 'medium', 'wide'];

const PAPER_TINTS: {value: PaperTint; label: string; swatch: string}[] = [
  {value: 'default', label: 'Default', swatch: 'var(--color-background)'},
  {value: 'vellum', label: 'Vellum', swatch: 'oklch(0.96 0.022 80)'},
  {value: 'cream', label: 'Cream', swatch: 'oklch(0.965 0.028 95)'},
  {value: 'slate', label: 'Slate', swatch: 'oklch(0.95 0.012 240)'},
];

const PREVIEW_TEXT =
  'In the long, slow, golden afternoon of a half-forgotten library, the reader settles into the chair and turns one careful page after another. The light shifts; the room exhales; the words cohere into something the eye can return to.';

export function SettingsPage() {
  const {theme, setTheme} = useHandbookStore();
  const defaultLayout = useWorkspaceStore((s) => s.defaultLayout);
  const showMap = useWorkspaceStore((s) => s.showMap);
  const showStagingInbox = useWorkspaceStore((s) => s.showStagingInbox);
  const setDefaultLayout = useWorkspaceStore((s) => s.setDefaultLayout);
  const setMode = useWorkspaceStore((s) => s.setMode);
  const setShowMap = useWorkspaceStore((s) => s.setShowMap);
  const setShowStagingInbox = useWorkspaceStore((s) => s.setShowStagingInbox);
  const reader = useReaderStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  function applyLayout(value: DefaultLayout) {
    setDefaultLayout(value);
    if (value === 'split') {
      setMode('split');
      setShowMap(true);
    } else if (value === 'reader-only') {
      setShowMap(false);
    } else if (value === 'map-only') {
      setMode('focus-right');
      setShowMap(true);
    }
  }

  async function handleReset() {
    const confirmed = window.confirm(
      'Permanently delete ALL documents, annotations, and maps? This cannot be undone.',
    );
    if (!confirmed) return;
    const confirmed2 = window.confirm('Are you absolutely sure?');
    if (!confirmed2) return;

    // Atomic wipe via Supabase RPC (see supabase/migrations/0002_reset_all_data.sql)
    const { error } = await supabase.rpc('reset_all_data');
    if (error) {
      console.error('Reset failed:', error);
      window.alert(`Reset failed: ${error.message}`);
      return;
    }

    // Reset in-memory stores
    useAnnotationStore.getState().reset();
    useMapStore.getState().reset();

    // Clear local UI prefs
    localStorage.removeItem('handbook:ui');
    localStorage.removeItem('learnit-workspace');
    localStorage.removeItem('learnit-reader');

    window.location.reload();
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        void importData(data, importMode)
          .then(() => {
            setImportStatus('Import successful.');
            setTimeout(() => setImportStatus(null), 3000);
          })
          .catch((e) => {
            console.error('Import failed:', e);
            setImportStatus('Import failed. Check console for details.');
            setTimeout(() => setImportStatus(null), 3000);
          });
      } catch {
        setImportStatus('Invalid file format.');
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold text-[var(--color-foreground)] mb-8">Settings</h1>

      {/* Onboarding */}
      <section className="mb-8 rounded-xl border bg-[var(--color-card)] p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-[var(--color-muted-foreground)]" />
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">About LearnIt</h2>
        </div>
        <div className="text-sm text-[var(--color-muted-foreground)] leading-relaxed space-y-2">
          <p>
            <strong className="text-[var(--color-foreground)]">Highlighting:</strong> Select any text in a document to save it as a highlight. Add tags and notes to organize your annotations.
          </p>
          <p>
            <strong className="text-[var(--color-foreground)]">Notes:</strong> Click any highlighted passage to open a note panel. Notes auto-save on blur.
          </p>
          <p>
            <strong className="text-[var(--color-foreground)]">Diagrams:</strong> Create concept maps and mind maps from templates. Drag nodes to rearrange; changes auto-save.
          </p>
          <p>
            <strong className="text-[var(--color-foreground)]">Data:</strong> Data syncs across devices via Supabase. Only layout preferences are stored locally. Export to back up, import to restore.
          </p>
        </div>
      </section>

      {/* Theme */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-[var(--color-muted-foreground)] mb-3">Appearance</h2>
        <div className="flex gap-2">
          {THEME_OPTIONS.map(({value, icon, label}) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={[
                'flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-colors',
                theme === value
                  ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]',
              ].join(' ')}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Reading */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-[var(--color-muted-foreground)]">Reading</h2>
          <button
            onClick={() => reader.reset()}
            className="flex items-center gap-1 text-[10px] smallcaps tracking-[0.1em] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition-colors"
          >
            <RotateCcw size={11} />
            Reset
          </button>
        </div>

        <div className="rounded-xl border bg-[var(--color-card)] p-4 flex flex-col gap-4">
          {/* Font face */}
          <div>
            <div className="text-xs text-[var(--color-muted-foreground)] mb-1.5">Font face</div>
            <div className="flex gap-1.5 flex-wrap">
              {FONT_FACES.map(({value, label}) => (
                <button
                  key={value}
                  onClick={() => reader.setFontFace(value)}
                  className={[
                    'px-3 py-1.5 rounded-md border text-[12px] transition-colors',
                    reader.fontFace === value
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent'
                      : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <div className="text-xs text-[var(--color-muted-foreground)] mb-1.5">Size</div>
            <div className="flex gap-1.5">
              {FONT_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => reader.setFontSize(s)}
                  className={[
                    'flex-1 px-2 py-1.5 rounded-md border text-[11px] uppercase tracking-wide transition-colors',
                    reader.fontSize === s
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent'
                      : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                  ].join(' ')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Weight */}
          <div>
            <div className="text-xs text-[var(--color-muted-foreground)] mb-1.5">Weight</div>
            <div className="flex gap-1.5">
              {FONT_WEIGHTS.map((w) => (
                <button
                  key={w}
                  onClick={() => reader.setFontWeight(w)}
                  className={[
                    'flex-1 px-2 py-1.5 rounded-md border text-[12px] capitalize transition-colors',
                    reader.fontWeight === w
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent'
                      : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                  ].join(' ')}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Line spacing */}
          <div>
            <div className="text-xs text-[var(--color-muted-foreground)] mb-1.5">Line spacing</div>
            <div className="flex gap-1.5">
              {LINE_SPACINGS.map((s) => (
                <button
                  key={s}
                  onClick={() => reader.setLineSpacing(s)}
                  className={[
                    'flex-1 px-2 py-1.5 rounded-md border text-[12px] capitalize transition-colors',
                    reader.lineSpacing === s
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent'
                      : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                  ].join(' ')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Reading width */}
          <div>
            <div className="text-xs text-[var(--color-muted-foreground)] mb-1.5">Reading width</div>
            <div className="flex gap-1.5">
              {READING_WIDTHS.map((w) => (
                <button
                  key={w}
                  onClick={() => reader.setReadingWidth(w)}
                  className={[
                    'flex-1 px-2 py-1.5 rounded-md border text-[12px] capitalize transition-colors',
                    reader.readingWidth === w
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent'
                      : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                  ].join(' ')}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Paper tint */}
          <div>
            <div className="text-xs text-[var(--color-muted-foreground)] mb-1.5">Paper tint</div>
            <div className="flex gap-2">
              {PAPER_TINTS.map((t) => (
                <button
                  key={t.value}
                  aria-label={t.label}
                  title={t.label}
                  onClick={() => reader.setPaperTint(t.value)}
                  className={[
                    'flex-1 h-9 rounded-md border-2 transition-colors',
                    reader.paperTint === t.value
                      ? 'border-[var(--color-primary)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-rule)]',
                  ].join(' ')}
                  style={{background: t.swatch}}
                />
              ))}
            </div>
          </div>

          {/* Justify */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm text-[var(--color-foreground)]">Justified text</div>
              <div className="text-xs text-[var(--color-muted-foreground)]">Even right edge; may produce uneven word spacing on narrow widths.</div>
            </div>
            <input
              type="checkbox"
              checked={reader.justify}
              onChange={(e) => reader.setJustify(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
          </label>

          {/* Hyphenate */}
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm text-[var(--color-foreground)]">Hyphenation</div>
              <div className="text-xs text-[var(--color-muted-foreground)]">Break long words across lines for tighter justification.</div>
            </div>
            <input
              type="checkbox"
              checked={reader.hyphenate}
              onChange={(e) => reader.setHyphenate(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
          </label>
        </div>

        {/* Live preview */}
        <div className="mt-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-background)] p-5">
          <div className="flex items-center gap-1.5 text-[10px] smallcaps tracking-[0.1em] text-[var(--color-muted-foreground)] mb-2">
            <Type size={11} />
            Preview
          </div>
          <article className="prose">
            <p>{PREVIEW_TEXT}</p>
          </article>
        </div>
      </section>

      {/* Layout */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-[var(--color-muted-foreground)] mb-3">Layout</h2>

        <div className="rounded-xl border bg-[var(--color-card)] p-4 mb-3">
          <div className="text-xs text-[var(--color-muted-foreground)] mb-2">Default layout</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {LAYOUT_OPTIONS.map(({value, icon, label, desc}) => (
              <button
                key={value}
                onClick={() => applyLayout(value)}
                className={[
                  'flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors',
                  defaultLayout === value
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] border-transparent'
                    : 'text-[var(--color-foreground)] hover:bg-[var(--color-accent)]',
                ].join(' ')}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  {icon}
                  {label}
                </div>
                <div className={`text-xs ${defaultLayout === value ? 'opacity-80' : 'text-[var(--color-muted-foreground)]'}`}>
                  {desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-[var(--color-card)] divide-y">
          <label className="flex items-center justify-between px-4 py-3 cursor-pointer">
            <div>
              <div className="text-sm font-medium text-[var(--color-foreground)]">Show concept map</div>
              <div className="text-xs text-[var(--color-muted-foreground)]">Render the right-pane map. Disable for full-width reader.</div>
            </div>
            <input
              type="checkbox"
              checked={showMap}
              onChange={(e) => setShowMap(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between px-4 py-3 cursor-pointer">
            <div>
              <div className="text-sm font-medium text-[var(--color-foreground)]">Show staging inbox</div>
              <div className="text-xs text-[var(--color-muted-foreground)]">Floating tray for captured ideas before placing on the map.</div>
            </div>
            <input
              type="checkbox"
              checked={showStagingInbox}
              onChange={(e) => setShowStagingInbox(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
              disabled={!showMap}
            />
          </label>
        </div>
      </section>

      {/* Data */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-[var(--color-muted-foreground)] mb-3">Data</h2>
        <div className="rounded-xl border bg-[var(--color-card)] divide-y">
          {/* Export */}
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm font-medium text-[var(--color-foreground)]">Export data</div>
              <div className="text-xs text-[var(--color-muted-foreground)]">Download all highlights, tags, and diagrams as JSON</div>
            </div>
            <button
              onClick={() => void downloadExport()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors shrink-0"
            >
              <Download size={13} />
              Export
            </button>
          </div>

          {/* Import */}
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm font-medium text-[var(--color-foreground)]">Import data</div>
              <div className="flex items-center gap-3 mt-1">
                <label className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)] cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                  />
                  Merge
                </label>
                <label className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)] cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                  />
                  Replace all
                </label>
              </div>
              {importStatus && (
                <div className="text-xs text-green-500 mt-1">{importStatus}</div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)] transition-colors shrink-0"
            >
              <Upload size={13} />
              Import
            </button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          </div>

          {/* Clear */}
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm font-medium text-[var(--color-foreground)]">Clear all data</div>
              <div className="text-xs text-[var(--color-muted-foreground)]">Permanently delete all highlights, tags, and diagrams</div>
            </div>
            <button
              onClick={() => void handleReset()}
              className={[
                'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors shrink-0',
                'text-[var(--color-muted-foreground)] hover:text-red-400 hover:border-red-500/30',
              ].join(' ')}
            >
              <Trash2 size={13} />
              Reset all data
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
