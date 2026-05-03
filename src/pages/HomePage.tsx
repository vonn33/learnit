import {useMemo} from 'react';
import {Link} from 'react-router';
import {getReadingProgress} from '@/lib/storage';
import {useDocStore, type Doc} from '@/store/docStore';

type RecentEntry = {
  url: string;
  title: string;
  scrollFraction: number;
  lastVisited: string;
};

function humanize(s: string): string {
  return s
    .split('-')
    .map((w) => (w[0]?.toUpperCase() ?? '') + w.slice(1))
    .join(' ');
}

function slugToTitle(slug: string): string {
  return slug
    .replace(/^part-\d+[a-z]?-/i, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function useRecentDocs(limit = 4): RecentEntry[] {
  return useMemo(() => {
    const progress = getReadingProgress();
    return Object.entries(progress)
      .filter(([, v]) => v.lastVisited)
      .sort(([, a], [, b]) => b.lastVisited.localeCompare(a.lastVisited))
      .slice(0, limit)
      .map(([url, v]) => {
        const slug = url.split('/').at(-1) ?? url;
        return {
          url,
          title: slugToTitle(slug),
          scrollFraction: v.scrollFraction,
          lastVisited: v.lastVisited,
        };
      });
  }, [limit]);
}

function RecentCard({entry}: {entry: RecentEntry}) {
  const pct = Math.round(entry.scrollFraction * 100);
  return (
    <Link
      to={entry.url}
      className="flex flex-col gap-3 p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-ring)] transition-colors"
    >
      <span className="text-sm font-medium text-[var(--color-card-foreground)] line-clamp-2">
        {entry.title}
      </span>
      <div className="mt-auto flex flex-col gap-1.5">
        <div className="h-1 rounded-full bg-[var(--color-muted)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-none"
            style={{width: `${pct}%`}}
          />
        </div>
        <span className="text-xs text-[var(--color-muted-foreground)]">{pct}% read</span>
      </div>
    </Link>
  );
}

function ProjectCard({
  projectKey,
  sections,
}: {
  projectKey: string;
  sections: Record<string, Doc[]>;
}) {
  const sectionEntries = Object.entries(sections);
  const totalDocs = sectionEntries.reduce((sum, [, docs]) => sum + docs.length, 0);

  // Link to the first doc in the project
  const firstSection = sectionEntries[0];
  const firstDoc = firstSection?.[1][0];
  const href = firstDoc
    ? `/docs/${projectKey}/${firstSection[0]}/${firstDoc.slug}`
    : '/docs';

  return (
    <Link
      to={href}
      className="flex flex-col gap-3 p-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-ring)] transition-colors"
    >
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-[var(--color-card-foreground)]">
          {humanize(projectKey)}
        </span>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {sectionEntries.length} {sectionEntries.length === 1 ? 'section' : 'sections'} · {totalDocs}{' '}
          {totalDocs === 1 ? 'doc' : 'docs'}
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {sectionEntries.map(([key]) => (
          <li key={key} className="text-xs text-[var(--color-muted-foreground)] truncate">
            {humanize(key)}
          </li>
        ))}
      </ul>
    </Link>
  );
}

export function HomePage() {
  const recent = useRecentDocs();
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

  const projects = Object.entries(grouped);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 flex flex-col gap-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Welcome back</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">Pick up where you left off or browse your library.</p>
      </div>

      {recent.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Recent
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recent.map((entry) => (
              <RecentCard key={entry.url} entry={entry} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Library
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map(([key, sections]) => (
            <ProjectCard key={key} projectKey={key} sections={sections} />
          ))}
        </div>
      </section>
    </div>
  );
}
