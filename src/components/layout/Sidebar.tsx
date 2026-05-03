import {useMemo, useState} from 'react';
import {NavLink, Link} from 'react-router';
import {ChevronDown, ChevronRight, ChevronLeft, Upload, Settings2} from 'lucide-react';
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
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {humanize(sectionKey)}
      </button>
      {open && (
        <div className="ml-3 border-l pl-2 flex flex-col gap-0.5">
          {docs.map((doc) => (
            <NavLink
              key={doc.id}
              to={docPath(projectKey, sectionKey, doc.slug)}
              className={({isActive}) =>
                [
                  'block px-2 py-1.5 text-xs rounded truncate transition-colors no-underline',
                  isActive
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-medium'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]',
                ].join(' ')
              }
            >
              {doc.title}
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
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-accent)] rounded transition-colors"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {humanize(projectKey)}
      </button>
      {open && (
        <div className="flex flex-col gap-1">
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

  return (
    <aside
      className={[
        'shrink-0 overflow-y-auto border-r bg-[var(--color-card)] py-3 flex flex-col transition-all duration-200',
        collapsed ? 'w-12' : 'w-64',
        className,
      ].join(' ')}
    >
      {!collapsed && (
        <div className="flex-1">
          <div className="px-2">
            <button
              onClick={() => setImportOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/80 rounded mb-3"
            >
              <Upload className="size-4" /> Import .md
            </button>
            <Link
              to="/manage"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-accent)] rounded mb-3"
            >
              <Settings2 className="size-4" /> Manage content
            </Link>
          </div>
          <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} />
          {Object.entries(grouped).map(([projectKey, sections]) => (
            <ProjectItem key={projectKey} projectKey={projectKey} sections={sections} />
          ))}
        </div>
      )}

      <div className={`mt-auto pt-2 border-t border-[var(--color-border)] flex ${collapsed ? 'justify-center' : 'justify-end px-2'}`}>
        <button
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="p-1.5 rounded hover:bg-[var(--color-accent)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
