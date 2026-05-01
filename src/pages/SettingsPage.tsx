import {useRef, useState} from 'react';
import {useHandbookStore} from '@/store';
import {downloadExport, importData} from '@/lib/exportImport';
import {saveTags, saveUserDiagrams} from '@/lib/storage';
import {Sun, Moon, Monitor, Download, Upload, Trash2, BookOpen, Columns2, FileText, Network} from 'lucide-react';
import { useAnnotationStore } from '@/store/annotationStore';
import { useMapStore } from '@/store/mapStore';
import { useWorkspaceStore, type DefaultLayout } from '@/store/workspaceStore';

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

export function SettingsPage() {
  const {theme, setTheme} = useHandbookStore();
  const defaultLayout = useWorkspaceStore((s) => s.defaultLayout);
  const showMap = useWorkspaceStore((s) => s.showMap);
  const showStagingInbox = useWorkspaceStore((s) => s.showStagingInbox);
  const setDefaultLayout = useWorkspaceStore((s) => s.setDefaultLayout);
  const setMode = useWorkspaceStore((s) => s.setMode);
  const setShowMap = useWorkspaceStore((s) => s.setShowMap);
  const setShowStagingInbox = useWorkspaceStore((s) => s.setShowStagingInbox);
  const [clearConfirm, setClearConfirm] = useState(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  function handleClear() {
    if (clearConfirm) {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      saveTags([]);
      saveUserDiagrams([]);
      useAnnotationStore.getState().reset();
      useMapStore.getState().reset();
      setClearConfirm(false);
    } else {
      setClearConfirm(true);
      clearTimerRef.current = setTimeout(() => setClearConfirm(false), 5000);
    }
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        importData(data, importMode);
        setImportStatus('Import successful.');
        setTimeout(() => setImportStatus(null), 3000);
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
            <strong className="text-[var(--color-foreground)]">Data:</strong> Everything is stored locally in your browser. Export to back up, import to restore.
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
              onClick={downloadExport}
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
              onClick={handleClear}
              className={[
                'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors shrink-0',
                clearConfirm
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'text-[var(--color-muted-foreground)] hover:text-red-400 hover:border-red-500/30',
              ].join(' ')}
            >
              <Trash2 size={13} />
              {clearConfirm ? 'Confirm clear?' : 'Clear'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
