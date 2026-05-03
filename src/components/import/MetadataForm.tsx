import { extractTitle, extractToc, extractAbstract, countWords, slugify } from '@/lib/mdParser';
import { useDocStore } from '@/store/docStore';
import type { NewDoc } from '@/store/docStore';

export type ParsedFile = {
  filename: string;
  content_md: string;
  title: string;
  slug: string;
  project: string;
  section: string;
  abstract: string;
  toc_json: ReturnType<typeof extractToc>;
  word_count: number;
};

export function parseFile(file: File, content: string): ParsedFile {
  const title = extractTitle(content, file.name);
  return {
    filename: file.name,
    content_md: content,
    title,
    slug: slugify(title || file.name.replace(/\.mdx?$/, '')),
    project: 'imports',
    section: 'general',
    abstract: extractAbstract(content),
    toc_json: extractToc(content),
    word_count: countWords(content),
  };
}

export function MetadataForm({
  parsed,
  onChange,
}: {
  parsed: ParsedFile;
  onChange: (next: ParsedFile) => void;
}) {
  const docs = useDocStore((s) => s.docs);
  const projects = Array.from(new Set(docs.map((d) => d.project)));

  function update<K extends keyof ParsedFile>(key: K, value: ParsedFile[K]) {
    onChange({ ...parsed, [key]: value });
  }

  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <div className="text-xs text-[var(--color-muted-foreground)]">{parsed.filename}</div>
      <Field label="Title">
        <input
          value={parsed.title}
          onChange={(e) => update('title', e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded bg-[var(--color-card)]"
        />
      </Field>
      <Field label="Slug">
        <input
          value={parsed.slug}
          onChange={(e) => update('slug', slugify(e.target.value))}
          className="w-full px-3 py-2 text-sm border rounded bg-[var(--color-card)]"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Project">
          <input
            list="projects-dl"
            value={parsed.project}
            onChange={(e) => update('project', e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded bg-[var(--color-card)]"
          />
          <datalist id="projects-dl">
            {projects.map((p) => <option key={p} value={p} />)}
          </datalist>
        </Field>
        <Field label="Section">
          <input
            value={parsed.section}
            onChange={(e) => update('section', e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded bg-[var(--color-card)]"
          />
        </Field>
      </div>
      <div className="text-xs text-[var(--color-muted-foreground)]">
        {parsed.word_count} words · {parsed.toc_json.length} sections
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs mb-1 text-[var(--color-muted-foreground)]">{label}</div>
      {children}
    </label>
  );
}

export function toNewDoc(p: ParsedFile): NewDoc {
  return {
    title: p.title,
    slug: p.slug,
    project: p.project,
    section: p.section,
    content_md: p.content_md,
    abstract: p.abstract,
    toc_json: p.toc_json,
    word_count: p.word_count,
  };
}
