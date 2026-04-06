import {lazy, Suspense, useCallback, useEffect, useRef} from 'react';
import {useLocation, Navigate} from 'react-router';
import {MDXProvider} from '@mdx-js/react';
import {Verdict} from '@/components/mdx/Verdict';
import {Callout} from '@/components/mdx/Callout';
import {Compare} from '@/components/mdx/Compare';
import {DataTable} from '@/components/mdx/DataTable';
import {ConceptMap} from '@/components/mdx/ConceptMap';
import {AnnotationLayer} from '@/components/reader/AnnotationLayer';
import {AnnotationToggle} from '@/components/reader/AnnotationToggle';
import {WorkspaceLayout} from '@/components/workspace/WorkspaceLayout';
import {MapCanvas} from '@/components/map/MapCanvas';
import {StagingInbox} from '@/components/map/StagingInbox';
import {saveReadingProgress, getReadingProgress} from '@/lib/storage';
import {useMapStore} from '@/store/mapStore';
import manifest from '@/data/content-manifest.json';

// Glob import all MDX files from local docs directory
const modules = import.meta.glob('/docs/**/*.mdx');

const MDX_COMPONENTS = {
  Verdict,
  Callout,
  Compare,
  DataTable,
  ConceptMap,
};

function getModuleKey(pathname: string): string | null {
  // pathname: /docs/language-learning/handbook/part-1a-fluent-forever
  const parts = pathname.replace(/^\/docs\//, '').split('/');
  if (parts.length < 3) return null;
  const [category, section, ...rest] = parts;
  const slug = rest.join('/');
  const candidate = `/docs/${category}/${section}/${slug}.mdx`;
  return modules[candidate] ? candidate : null;
}

function getFirstDocPath(): string {
  const typedManifest = manifest as Record<
    string,
    {sections: Record<string, {docs: string[]}>}
  >;
  for (const [cat, catData] of Object.entries(typedManifest)) {
    for (const [sec, secData] of Object.entries(catData.sections)) {
      if (secData.docs[0]) {
        return `/docs/${cat}/${sec}/${secData.docs[0]}`;
      }
    }
  }
  return '/docs';
}

function ProgressBar({pageUrl}: {pageUrl: string}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const progress = getReadingProgress()[pageUrl];
    if (ref.current && progress) {
      ref.current.style.width = `${progress.scrollFraction * 100}%`;
    }
  }, [pageUrl]);

  useEffect(() => {
    function onScroll() {
      const el = document.getElementById('docs-content');
      if (!el || !ref.current) return;
      const scrollable = el.scrollHeight - el.clientHeight;
      if (scrollable <= 0) return;
      const fraction = el.scrollTop / scrollable;
      ref.current.style.width = `${fraction * 100}%`;
      saveReadingProgress(pageUrl, fraction);
    }
    const el = document.getElementById('docs-content');
    el?.addEventListener('scroll', onScroll, {passive: true});
    return () => el?.removeEventListener('scroll', onScroll);
  }, [pageUrl]);

  return (
    <div className="h-0.5 bg-[var(--color-border)] fixed top-12 left-0 right-0 z-20">
      <div
        ref={ref}
        className="h-full bg-[var(--color-primary)] transition-none"
        style={{width: '0%'}}
      />
    </div>
  );
}

export function DocsPage() {
  const location = useLocation();
  const pathname = location.pathname;

  if (pathname === '/docs' || pathname === '/docs/') {
    return <Navigate to={getFirstDocPath()} replace />;
  }

  const moduleKey = getModuleKey(pathname);

  // Extract topicId (category) from pathname: /docs/language-learning/...
  const topicId = pathname.split('/')[2] ?? '';

  const handleMapNodeClick = useCallback((nodeId: string) => {
    const topicMap = useMapStore.getState().maps[topicId];
    if (!topicMap) return;
    const node = topicMap.nodes.find((n) => n.id === nodeId);
    if (!node?.annotationId) return;

    const mark = document.querySelector(`mark[data-annotation-id="${node.annotationId}"]`);
    if (mark) {
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      mark.classList.add('ring-2', 'ring-primary');
      setTimeout(() => mark.classList.remove('ring-2', 'ring-primary'), 2000);
    }
  }, [topicId]);

  if (!moduleKey) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-muted-foreground)] text-sm">
        Page not found. Check the sidebar for available content.
      </div>
    );
  }

  const Content = lazy(modules[moduleKey] as () => Promise<{default: React.ComponentType}>);

  return (
    <WorkspaceLayout
      left={
        <div className="relative h-full">
          <MapCanvas topicId={topicId} onNodeClick={handleMapNodeClick} />
          <StagingInbox topicId={topicId} />
        </div>
      }
      right={
        <div id="docs-content" className="h-full overflow-y-auto">
          <ProgressBar pageUrl={pathname} />
          <div className="flex justify-end px-4 pt-2">
            <AnnotationToggle />
          </div>
          <div className="max-w-3xl mx-auto px-6 py-4">
            <MDXProvider components={MDX_COMPONENTS}>
              <article className="prose">
                <Suspense fallback={<div className="text-[var(--color-muted-foreground)] text-sm">Loading…</div>}>
                  <Content />
                </Suspense>
              </article>
            </MDXProvider>
          </div>
          <AnnotationLayer pageUrl={pathname} topicId={topicId} />
        </div>
      }
    />
  );
}
