export type TocEntry = {
  level: number;
  text: string;
  slug: string;
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function extractToc(md: string): TocEntry[] {
  if (!md) return [];
  const lines = md.split('\n');
  const out: TocEntry[] = [];
  let inFence = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!match) continue;
    const level = match[1].length;
    const text = match[2];
    out.push({ level, text, slug: slugify(text) });
  }

  return out;
}

function stripFrontmatter(md: string): string {
  if (!md.startsWith('---')) return md;
  const end = md.indexOf('\n---', 3);
  if (end === -1) return md;
  return md.slice(end + 4).replace(/^\n+/, '');
}

export function extractAbstract(md: string): string {
  if (!md) return '';
  const body = stripFrontmatter(md);
  const lines = body.split('\n');
  let i = 0;

  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length && /^#\s+/.test(lines[i])) i++;
  while (i < lines.length && lines[i].trim() === '') i++;

  const paragraph: string[] = [];
  while (i < lines.length && lines[i].trim() !== '') {
    paragraph.push(lines[i].trim());
    i++;
  }
  return paragraph.join(' ').trim();
}

export function countWords(md: string): number {
  if (!md) return 0;
  const stripped = md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/[#>*_\-\[\]()]/g, ' ')
    .trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).filter(Boolean).length;
}

export function extractTitle(md: string, filename?: string): string {
  const body = stripFrontmatter(md);
  const match = body.match(/^#\s+(.+?)\s*$/m);
  if (match) return match[1].trim();
  if (filename) return filename.replace(/\.mdx?$/, '');
  return '';
}
