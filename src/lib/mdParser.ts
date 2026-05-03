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
