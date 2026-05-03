import { useEffect, useState } from 'react';
import type { TocEntry } from '@/lib/supabase';

export function TOCPanel({ toc }: { toc: TocEntry[] }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    if (toc.length === 0) return;
    const slugs = toc.map((t) => t.slug);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActiveSlug(visible[0].target.id);
      },
      { rootMargin: '-10% 0px -75% 0px', threshold: 0 },
    );
    for (const slug of slugs) {
      const el = document.getElementById(slug);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [toc]);

  function jumpTo(slug: string) {
    const el = document.getElementById(slug);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (toc.length === 0) return null;

  return (
    <nav className="text-sm space-y-1 p-3 max-h-[80vh] overflow-y-auto">
      <div className="text-xs uppercase tracking-wider text-[var(--color-muted-foreground)] mb-2">On this page</div>
      {toc.map((t) => (
        <button
          key={t.slug}
          onClick={() => jumpTo(t.slug)}
          className={`block w-full text-left text-xs py-1 hover:text-[var(--color-foreground)] ${activeSlug === t.slug ? 'text-[var(--color-foreground)] font-medium' : 'text-[var(--color-muted-foreground)]'}`}
          style={{ paddingLeft: `${(t.level - 1) * 0.75}rem` }}
        >
          {t.text}
        </button>
      ))}
    </nav>
  );
}
