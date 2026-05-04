import {useMemo} from 'react';
import {Link} from 'react-router';
import {ArrowUpRight, BookOpen, Quote} from 'lucide-react';
import {getReadingProgress} from '@/lib/storage';
import {useDocStore, type Doc} from '@/store/docStore';
import {useAnnotationStore} from '@/store/annotationStore';

type RecentEntry = {
  url: string;
  title: string;
  scrollFraction: number;
  lastVisited: string;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

function formatToday(): string {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return '—';
  const mins = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

function useRecentDocs(limit = 6): RecentEntry[] {
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

function HeroCurrent({entry}: {entry: RecentEntry}) {
  const pct = Math.round(entry.scrollFraction * 100);
  return (
    <Link
      to={entry.url}
      className="group relative block overflow-hidden rounded-xl border border-[var(--color-rule)] bg-[var(--color-card)] p-7 sm:p-9 hover:border-[var(--color-primary)]/55 transition-colors no-underline"
    >
      {/* Decorative spine — left edge ink stripe */}
      <span
        aria-hidden
        className="absolute left-0 top-6 bottom-6 w-[3px] rounded-r bg-[var(--color-primary)] opacity-80"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full bg-[var(--color-primary)]/8 blur-2xl"
      />

      <div className="flex items-center gap-2 smallcaps text-[10px] tracking-[0.14em] text-[var(--color-muted-foreground)] mb-4">
        <BookOpen size={11} className="text-[var(--color-primary)]" />
        Currently Reading
        <span aria-hidden className="ml-2 flex-1 h-px bg-[var(--color-rule)] max-w-[6rem]" />
      </div>

      <h2
        className="font-display text-[var(--color-ink)] text-3xl sm:text-4xl leading-[1.05] tracking-tight mb-5 max-w-[22ch]"
        style={{fontVariationSettings: '"opsz" 144, "SOFT" 60, "wght" 460'}}
      >
        {entry.title}
      </h2>

      <div className="flex items-end gap-6">
        <div className="flex-1 max-w-md">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="smallcaps text-[10px] tracking-[0.12em] text-[var(--color-muted-foreground)]">
              Progress
            </span>
            <span
              className="font-mono text-[11px] text-[var(--color-foreground)] tabular-nums"
              style={{fontVariationSettings: '"MONO" 1'}}
            >
              {pct}%
            </span>
          </div>
          <div className="relative h-[3px] rounded-full bg-[var(--color-muted)] overflow-hidden">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-primary)] transition-[width]"
              style={{width: `${pct}%`}}
            />
          </div>
          <span className="block mt-2 text-[11px] text-[var(--color-muted-foreground)]">
            Last opened {timeAgo(entry.lastVisited)}
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] smallcaps tracking-[0.1em] text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)] transition-colors">
          Resume
          <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}

function MarginaliaCard({count, latest}: {count: number; latest?: {text: string; color?: string}}) {
  return (
    <Link
      to="/annotations"
      className="group relative flex flex-col gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-vellum)] p-6 hover:border-[var(--color-primary)]/55 transition-colors no-underline overflow-hidden"
    >
      <div className="flex items-center gap-2 smallcaps text-[10px] tracking-[0.14em] text-[var(--color-muted-foreground)]">
        <Quote size={11} className="text-[var(--color-primary)]" />
        Marginalia
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className="font-display text-[var(--color-ink)] text-5xl leading-none tabular-nums"
          style={{fontVariationSettings: '"opsz" 144, "SOFT" 70, "wght" 420'}}
        >
          {count}
        </span>
        <span className="text-[11px] text-[var(--color-muted-foreground)]">
          {count === 1 ? 'note in the margins' : 'notes in the margins'}
        </span>
      </div>

      {latest && (
        <p className="font-prose italic text-[13px] text-[var(--color-muted-foreground)] leading-snug line-clamp-3 border-l-2 pl-3 mt-1"
           style={{borderColor: latest.color || 'var(--color-primary)'}}
        >
          “{latest.text}”
        </p>
      )}

      <span className="mt-auto pt-1 flex items-center gap-1.5 text-[11px] smallcaps tracking-[0.1em] text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)] transition-colors">
        Browse all
        <ArrowUpRight size={11} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </Link>
  );
}

function RecentChip({entry}: {entry: RecentEntry}) {
  const pct = Math.round(entry.scrollFraction * 100);
  return (
    <Link
      to={entry.url}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-md border border-[var(--color-border)]/60 bg-[var(--color-card)]/60 hover:border-[var(--color-primary)]/45 hover:bg-[var(--color-card)] transition-colors no-underline"
    >
      <span
        aria-hidden
        className="font-mono text-[10px] text-[var(--color-muted-foreground)] tabular-nums w-8 shrink-0"
      >
        {pct}%
      </span>
      <span className="flex-1 text-[13px] text-[var(--color-foreground)] truncate font-prose"
            style={{fontVariationSettings: '"opsz" 16, "wght" 460'}}
      >
        {entry.title}
      </span>
      <ArrowUpRight size={11} className="text-[var(--color-muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  );
}

function Shelf({
  projectKey,
  sections,
}: {
  projectKey: string;
  sections: Record<string, Doc[]>;
}) {
  const sectionEntries = Object.entries(sections);
  const totalDocs = sectionEntries.reduce((sum, [, docs]) => sum + docs.length, 0);

  const firstSection = sectionEntries[0];
  const firstDoc = firstSection?.[1][0];
  const href = firstDoc
    ? `/docs/${projectKey}/${firstSection[0]}/${firstDoc.slug}`
    : '/docs';

  return (
    <Link
      to={href}
      className="group relative flex flex-col gap-4 rounded-lg border border-[var(--color-rule)] bg-[var(--color-card)] p-5 hover:border-[var(--color-primary)]/55 hover:translate-y-[-1px] transition-all no-underline overflow-hidden"
    >
      <span
        aria-hidden
        className="absolute left-5 top-0 h-[2px] w-10 bg-[var(--color-primary)]/65 rounded-b"
      />
      <div className="flex items-start justify-between gap-3 pt-1">
        <h3
          className="font-display italic text-[var(--color-ink)] text-xl leading-tight"
          style={{fontVariationSettings: '"opsz" 36, "SOFT" 80, "wght" 460'}}
        >
          {humanize(projectKey)}
        </h3>
        <ArrowUpRight
          size={14}
          className="text-[var(--color-muted-foreground)] opacity-0 group-hover:opacity-100 group-hover:text-[var(--color-primary)] transition-all translate-y-1 group-hover:translate-y-0 shrink-0 mt-1"
        />
      </div>

      <div className="flex items-center gap-2 smallcaps text-[10px] tracking-[0.12em] text-[var(--color-muted-foreground)]">
        <span>{sectionEntries.length} {sectionEntries.length === 1 ? 'Section' : 'Sections'}</span>
        <span className="opacity-50">·</span>
        <span>{totalDocs} {totalDocs === 1 ? 'Doc' : 'Docs'}</span>
      </div>

      <ul className="flex flex-col gap-1 mt-1">
        {sectionEntries.slice(0, 4).map(([key, docs]) => (
          <li key={key} className="flex items-baseline gap-3 text-[12.5px] font-prose text-[var(--color-muted-foreground)]"
              style={{fontVariationSettings: '"opsz" 16'}}
          >
            <span className="truncate">{humanize(key)}</span>
            <span aria-hidden className="flex-1 border-b border-dotted border-[var(--color-rule)] translate-y-[-3px]" />
            <span className="font-mono text-[10px] tabular-nums opacity-70">{docs.length}</span>
          </li>
        ))}
        {sectionEntries.length > 4 && (
          <li className="text-[11px] italic text-[var(--color-muted-foreground)] opacity-70 pt-0.5">
            + {sectionEntries.length - 4} more
          </li>
        )}
      </ul>
    </Link>
  );
}

function EmptyLibrary() {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-rule)] p-12 text-center bg-[var(--color-card)]/40">
      <Quote size={20} className="mx-auto mb-4 text-[var(--color-primary)]/70" />
      <h3
        className="font-display italic text-[var(--color-ink)] text-2xl mb-2"
        style={{fontVariationSettings: '"opsz" 72, "SOFT" 80, "wght" 420'}}
      >
        An empty room awaits its first volume.
      </h3>
      <p className="font-prose text-[14px] text-[var(--color-muted-foreground)] max-w-md mx-auto leading-relaxed">
        Import a Markdown file from the sidebar to begin. Your highlights, marginalia and concept maps will gather here.
      </p>
    </div>
  );
}

export function HomePage() {
  const recent = useRecentDocs();
  const docs = useDocStore((s) => s.docs);
  const annotations = useAnnotationStore((s) => s.annotations);

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
  const [hero, ...restRecent] = recent;

  const latestAnn = useMemo(() => {
    if (!annotations.length) return undefined;
    const sorted = [...annotations].sort((a, b) =>
      (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    );
    return sorted[0]?.text ? {text: sorted[0].text} : undefined;
  }, [annotations]);

  const today = formatToday();
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return 'Late hours.';
    if (h < 12) return 'Good morning.';
    if (h < 18) return 'Good afternoon.';
    if (h < 22) return 'Good evening.';
    return 'Late hours.';
  })();

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 py-12 sm:py-16 flex flex-col gap-12 ink-in">
      {/* Masthead */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3 text-[var(--color-muted-foreground)]">
          <span className="smallcaps text-[10px] tracking-[0.18em]">{today}</span>
        </div>
        <h1
          className="font-display text-[var(--color-ink)] text-4xl sm:text-[3.25rem] leading-[1.02] tracking-tight italic"
          style={{fontVariationSettings: '"opsz" 144, "SOFT" 70, "wght" 440'}}
        >
          {greeting}
        </h1>
      </header>

      {/* Hero + Marginalia row */}
      {hero ? (
        <section className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5 ink-stagger">
          <HeroCurrent entry={hero} />
          <MarginaliaCard count={annotations.length} latest={latestAnn} />
        </section>
      ) : (
        <section>
          <EmptyLibrary />
        </section>
      )}

      {/* Recent strip */}
      {restRecent.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="smallcaps text-[10px] tracking-[0.18em] text-[var(--color-muted-foreground)]">
              Lately Re-opened
            </h2>
            <span aria-hidden className="flex-1 h-px bg-[var(--color-rule)]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 ink-stagger">
            {restRecent.map((entry) => (
              <RecentChip key={entry.url} entry={entry} />
            ))}
          </div>
        </section>
      )}

      {/* Library shelves */}
      <section className="flex flex-col gap-5">
        <div className="flex items-baseline gap-3">
          <h2
            className="font-display italic text-[var(--color-ink)] text-2xl"
            style={{fontVariationSettings: '"opsz" 72, "SOFT" 70, "wght" 440'}}
          >
            The Library
          </h2>
          <span aria-hidden className="flex-1 h-px bg-[var(--color-rule)] translate-y-[-4px]" />
          <span className="smallcaps text-[10px] tracking-[0.14em] text-[var(--color-muted-foreground)]">
            {projects.length} {projects.length === 1 ? 'shelf' : 'shelves'}
          </span>
        </div>

        {projects.length === 0 ? (
          <EmptyLibrary />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ink-stagger">
            {projects.map(([key, sections]) => (
              <Shelf key={key} projectKey={key} sections={sections} />
            ))}
          </div>
        )}
      </section>

      {/* Colophon footer ornament */}
      <footer className="pt-8 pb-2">
        <div className="rule-flourish smallcaps text-[10px] tracking-[0.2em] opacity-70">
          ⁂
        </div>
      </footer>
    </div>
  );
}
