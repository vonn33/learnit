import {useState} from 'react';
import {NavLink} from 'react-router';
import {ChevronDown, ChevronRight} from 'lucide-react';
import manifest from '@/data/content-manifest.json';

type DocEntry = string;
type Section = {label: string; link: string; docs: DocEntry[]};
type Category = {label: string; link: string; sections: Record<string, Section>};
type Manifest = Record<string, Category>;

const typedManifest = manifest as Manifest;

function docPath(categoryKey: string, sectionKey: string, docSlug: string): string {
  return `/docs/${categoryKey}/${sectionKey}/${docSlug}`;
}

function SectionItem({
  categoryKey,
  sectionKey,
  section,
  defaultOpen,
}: {
  categoryKey: string;
  sectionKey: string;
  section: Section;
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
        {section.label}
      </button>
      {open && (
        <div className="ml-3 border-l pl-2 flex flex-col gap-0.5">
          {section.docs.map((slug) => (
            <NavLink
              key={slug}
              to={docPath(categoryKey, sectionKey, slug)}
              className={({isActive}) =>
                [
                  'block px-2 py-1.5 text-xs rounded truncate transition-colors no-underline',
                  isActive
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-medium'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-accent)]',
                ].join(' ')
              }
            >
              {slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryItem({categoryKey, category}: {categoryKey: string; category: Category}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[var(--color-foreground)] hover:bg-[var(--color-accent)] rounded transition-colors"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {category.label}
      </button>
      {open && (
        <div className="flex flex-col gap-1">
          {Object.entries(category.sections).map(([sectionKey, section], i) => (
            <SectionItem
              key={sectionKey}
              categoryKey={categoryKey}
              sectionKey={sectionKey}
              section={section}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({className = ''}: {className?: string}) {
  return (
    <aside
      className={[
        'w-64 shrink-0 overflow-y-auto border-r bg-[var(--color-card)] py-3',
        className,
      ].join(' ')}
    >
      {Object.entries(typedManifest).map(([key, category]) => (
        <CategoryItem key={key} categoryKey={key} category={category} />
      ))}
    </aside>
  );
}
