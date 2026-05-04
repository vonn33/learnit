import {useMemo, useState} from 'react';
import {NavLink, Link} from 'react-router';
import {ChevronDown, ChevronRight, ChevronLeft, Upload, Settings2, BookMarked} from 'lucide-react';
import {useWorkspaceStore} from '@/store/workspaceStore';
import {useDocStore, type Doc} from '@/store/docStore';
import {ImportWizard} from '@/components/import/ImportWizard';

function humanize(s: string): string {
  return s
    .split('-')
    .map((w) => (w[0]?.toUpperCase() ?? '') + w.slice(1))
    .join(' ');
}

function docPath(projectKey: string, sectionKey: string, slug: string): string {
  return `/docs/${projectKey}/${sectionKey}/${slug}`;
}

function SectionItem({
  projectKey,
  sectionKey,
  docs,
  defaultOpen,
}: {
  projectKey: string;
  sectionKey: string;
  docs: Doc[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 smallcaps text-[10px] tracking-[0.1em] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
      >
        <ChevronRight
          size={11}
          className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
        />
        {humanize(sectionKey)}
        <span className="ml-auto font-mono text-[10px] opacity-50">{docs.length}</span>
      </button>
      {open && (
        <div className="ml-[14px] border-l border-[var(--color-rule)] pl-2 flex flex-col gap-px py-1">
          {docs.map((doc) => (
            <NavLink
              key={doc.id}
              to={docPath(projectKey, sectionKey, doc.slug)}
              className={({isActive}) =>
                [
                  'group relative block px-2 py-1.5 text-[12.5px] rounded-md truncate transition-colors no-underline leading-snug',
                  isActive
                    ? 'text-[var(--color-ink)] bg-[var(--color-accent)]'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/60',
                ].join(' ')
              }
            >
              {({isActive}) => (
                <>
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute -left-[10px] top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[var(--color-primary)]"
                    />
                  )}
                  {doc.title}
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectItem({
  projectKey,
  sections,
}: {
  projectKey: string;
  sections: Record<string, Doc[]>;
}) {
  const [open, setOpen] = useState(true);
  const sectionEntries = Object.entries(sections);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 font-display italic text-[15px] text-[var(--color-ink)] hover:text-[var(--color-primary)] transition-colors"
        style={{fontVariationSettings: '"opsz" 36, "SOFT" 70, "wght" 480'}}
      >
        <ChevronDown
          size={12}
          className={`text-[var(--color-muted-foreground)] transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
        />
        {humanize(projectKey)}
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 mt-0.5">
          {sectionEntries.map(([sectionKey, docs], i) => (
            <SectionItem
              key={sectionKey}
              projectKey={projectKey}
              sectionKey={sectionKey}
              docs={docs}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({className = ''}: {className?: string}) {
  const collapsed = useWorkspaceStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useWorkspaceStore((s) => s.setSidebarCollapsed);
  const [importOpen, setImportOpen] = useState(false);
  const docs = useDocStore((s) => s.docs);

  const grouped = useMemo(() => {
    const out: Record<string, Record<string, Doc[]>> = {};
    for (const d of docs) {
      out[d.project] ??= {};
      out[d.project][d.section] ??= [];
      out[d.project][d.section].push(d);
    }
    return out;
  }, [docs]);

  const projectCount = Object.keys(grouped).length;

  return (
    <aside
      className={[
        'shrink-0 self-start sticky top-14 border-r border-[var(--color-rule)] bg-[var(--color-card)] py-3 flex flex-col transition-all duration-200',
        collapsed ? 'w-12' : 'w-64',
        className,
      ].join(' ')}
      style={{maxHeight: 'calc(100dvh - 56px)', overflowY: 'auto'}}
    >
      {!collapsed && (
        <div className="flex-1">
          <div className="px-2 mb-3">
            <button
              onClick={() => setImportOpen(true)}
              className="group w-full flex items-center gap-2 px-3 py-2 text-[12.5px] rounded-md bg-[var(--color-vellum)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-accent)] text-[var(--color-foreground)] transition-colors"
            >
              <Upload className="size-3.5 text-[var(--color-primary)]" />
              <span>Import</span>
              <span className="ml-auto font-mono text-[10px] text-[var(--color-muted-foreground)]">.md</span>
            </button>
            <Link
              to="/manage"
              className="w-full flex items-center gap-2 px-3 py-1.5 mt-1 text-[12px] rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]/60 transition-colors no-underline"
            >
              <Settings2 className="size-3.5 opacity-70" />
              <span>Manage shelves</span>
            </Link>
          </div>

          <div className="px-3 my-3 flex items-center gap-2">
            <span aria-hidden className="flex-1 h-px bg-[var(--color-rule)]" />
            <BookMarked size={11} className="text-[var(--color-muted-foreground)] opacity-60" />
            <span aria-hidden className="flex-1 h-px bg-[var(--color-rule)]" />
          </div>

          <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} />

          <div className="px-2">
            {Object.entries(grouped).map(([projectKey, sections]) => (
              <ProjectItem key={projectKey} projectKey={projectKey} sections={sections} />
            ))}
          </div>

          {projectCount === 0 && (
            <div className="px-4 py-6 mx-2 rounded-lg border border-dashed border-[var(--color-rule)] text-center">
              <p className="font-display italic text-sm text-[var(--color-foreground)] mb-1.5"
                style={{fontVariationSettings: '"opsz" 24, "SOFT" 70, "wght" 420'}}
              >
                Empty shelves.
              </p>
              <p className="text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
                Import a <span className="font-mono text-[10px]">.md</span> file to begin your library.
              </p>
            </div>
          )}
        </div>
      )}

      <div className={`mt-auto pt-2 border-t border-[var(--color-rule)] flex ${collapsed ? 'justify-center' : 'justify-between items-center px-3'}`}>
        {!collapsed && (
          <span className="smallcaps text-[10px] tracking-[0.1em] text-[var(--color-muted-foreground)] opacity-70">
            {projectCount} {projectCount === 1 ? 'shelf' : 'shelves'}
          </span>
        )}
        <button
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-[var(--color-accent)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
