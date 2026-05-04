import { Component, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import * as devRuntime from 'react/jsx-dev-runtime';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import rehypeSlug from 'rehype-slug';
import { Verdict } from '@/components/mdx/Verdict';
import { Callout } from '@/components/mdx/Callout';
import { Compare } from '@/components/mdx/Compare';
import { DataTable } from '@/components/mdx/DataTable';
import { ConceptMap } from '@/components/mdx/ConceptMap';

const components = { Verdict, Callout, Compare, DataTable, ConceptMap };

const MAX_CACHE = 8;
const cache = new Map<string, ReactElement>();

function cacheGet(key: string): ReactElement | undefined {
  const value = cache.get(key);
  if (value === undefined) return undefined;
  cache.delete(key);
  cache.set(key, value);
  return value;
}

function cacheSet(key: string, value: ReactElement): void {
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

class MdxErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    if (this.state.error) {
      return (
        <pre className="text-red-500 p-4 text-sm">
          MDX render error: {this.state.error}
        </pre>
      );
    }
    return this.props.children;
  }
}

export function RuntimeMdx({ source }: { source: string }) {
  const [el, setEl] = useState<ReactElement | null>(() => cacheGet(source) ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = cacheGet(source);
    if (cached) {
      setEl(cached);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const mod = await evaluate(source, {
          ...runtime,
          ...(import.meta.env.DEV ? devRuntime : {}),
          remarkPlugins: [remarkFrontmatter, remarkGfm],
          rehypePlugins: [rehypeSlug],
        });
        const Content = mod.default as (props: { components: typeof components }) => ReactElement;
        const rendered = <Content components={components} />;
        cacheSet(source, rendered);
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
  return <MdxErrorBoundary>{el}</MdxErrorBoundary>;
}
