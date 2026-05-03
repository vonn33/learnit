import { useEffect, useState, type ReactElement } from 'react';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import * as devRuntime from 'react/jsx-dev-runtime';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { Verdict } from '@/components/mdx/Verdict';
import { Callout } from '@/components/mdx/Callout';
import { Compare } from '@/components/mdx/Compare';
import { DataTable } from '@/components/mdx/DataTable';
import { ConceptMap } from '@/components/mdx/ConceptMap';

const components = { Verdict, Callout, Compare, DataTable, ConceptMap };

const cache = new Map<string, ReactElement>();

export function RuntimeMdx({ source }: { source: string }) {
  const [el, setEl] = useState<ReactElement | null>(() => cache.get(source) ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache.has(source)) {
      setEl(cache.get(source)!);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const mod = await evaluate(source, {
          ...runtime,
          ...(import.meta.env.DEV ? devRuntime : {}),
          remarkPlugins: [remarkFrontmatter, remarkGfm],
        });
        const Content = mod.default as (props: { components: typeof components }) => ReactElement;
        const rendered = <Content components={components} />;
        cache.set(source, rendered);
        if (!cancelled) setEl(rendered);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'MDX compile error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (error) return <pre className="text-red-500 p-4">{error}</pre>;
  if (!el) return <div className="p-4 text-[var(--color-muted-foreground)]">Loading…</div>;
  return el;
}
