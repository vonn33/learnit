import {useCallback, useEffect, useRef} from 'react';
import {useLocation, Navigate, useNavigate} from 'react-router';
import {List, ListX} from 'lucide-react';
import {RuntimeMdx} from '@/components/mdx/RuntimeMdx';
import {AnnotationLayer} from '@/components/reader/AnnotationLayer';
import {AnnotationToggle} from '@/components/reader/AnnotationToggle';
import {DocNav} from '@/components/reader/DocNav';
import {TOCPanel} from '@/components/reader/TOCPanel';
import {WorkspaceLayout} from '@/components/workspace/WorkspaceLayout';
import {MapCanvas} from '@/components/map/MapCanvas';
import {StagingInbox} from '@/components/map/StagingInbox';
import {saveReadingProgress, getReadingProgress} from '@/lib/storage';
import {computeScrollFraction} from '@/lib/scrollFraction';
import {useMapStore} from '@/store/mapStore';
import {useWorkspaceStore} from '@/store/workspaceStore';
import {useDocStore, type Doc} from '@/store/docStore';

// TODO: integration tests for runtime-fetched docs are deferred until Supabase
// is provisioned. The static-glob test was removed as part of the F2 migration.

function parsePath(pathname: string): {project: string; section: string; slug: string} | null {
  const parts = pathname.replace(/^\/docs\/?/, '').split('/').filter(Boolean);
  if (parts.length < 3) return null;
  const [project, section, ...rest] = parts;
  const slug = rest.join('/');
  return {project, section, slug};
}

export function getFirstDocPathForTopic(topicId: string): string | null {
  const docs = useDocStore.getState().docs;
  const candidates = docs.filter((d) => d.project === topicId);
  if (candidates.length === 0) return null;
  // Pick first by section, then by created order (already ordered by createdAt desc in fetchAll)
  const sectionsSeen: Record<string, Doc> = {};
  for (const d of candidates) {
    if (!sectionsSeen[d.section]) sectionsSeen[d.section] = d;
  }
  const firstSectionKey = Object.keys(sectionsSeen)[0];
  if (!firstSectionKey) return null;
  const d = sectionsSeen[firstSectionKey];
  return `/docs/${d.project}/${d.section}/${d.slug}`;
}

function getFirstDocPath(): string {
  const docs = useDocStore.getState().docs;
  if (docs.length === 0) return '/docs';
  const d = docs[0];
  return `/docs/${d.project}/${d.section}/${d.slug}`;
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
      if (!ref.current) return;
      const fraction = computeScrollFraction({
        scrollY: window.scrollY,
        scrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
      });
      ref.current.style.width = `${fraction * 100}%`;
      saveReadingProgress(pageUrl, fraction);
    }
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, [pageUrl]);

  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 z-[21] bg-transparent">
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
  const navigate = useNavigate();
  const pathname = location.pathname;
  const showStagingInbox = useWorkspaceStore((s) => s.showStagingInbox);
  const showToc = useWorkspaceStore((s) => s.showToc);
  const toggleToc = useWorkspaceStore((s) => s.toggleToc);

  const docs = useDocStore((s) => s.docs);
  const activeContent = useDocStore((s) => s.activeContent);
  const loading = useDocStore((s) => s.loading);
  const fetchAll = useDocStore((s) => s.fetchAll);
  const fetchContent = useDocStore((s) => s.fetchContent);

  const parsed = parsePath(pathname);
  const slug = parsed?.slug ?? '';
  const project = parsed?.project ?? '';
  const section = parsed?.section ?? '';

  // Locate metadata for the current path. Match on slug + project + section to
  // disambiguate slugs that may collide across projects.
  const meta = parsed
    ? docs.find((d) => d.slug === slug && d.project === project && d.section === section) ?? null
    : null;

  // topicId historically scopes the concept map by project/category, not by doc.
  // Keep that semantic — use the project segment so existing maps remain reachable.
  const topicId = project;

  // Trigger fetchAll on mount when docs list is empty.
  useEffect(() => {
    if (docs.length === 0 && !loading) {
      void fetchAll();
    }
  }, [docs.length, loading, fetchAll]);

  // Fetch content whenever the slug changes.
  useEffect(() => {
    if (!slug) return;
    if (activeContent?.slug === slug) return;
    void fetchContent(slug);
  }, [slug, activeContent?.slug, fetchContent]);

  // Restore reading scroll position when content loads (window scroll, not inner div).
  useEffect(() => {
    if (!activeContent || activeContent.slug !== slug) return;
    const progress = getReadingProgress()[pathname];
    if (!progress) {
      window.scrollTo({top: 0, behavior: 'auto'});
      return;
    }
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({top: progress.scrollFraction * max, behavior: 'auto'});
    });
  }, [activeContent, slug, pathname]);

  // ALL hooks must be called before any early returns
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

  const handleMapNodeDoubleClick = useCallback(
    (nodeId: string) => {
      const topicMap = useMapStore.getState().maps[topicId];
      if (!topicMap) return;
      const node = topicMap.nodes.find((n) => n.id === nodeId);
      if (!node?.linkedMapId) return;
      const path = getFirstDocPathForTopic(node.linkedMapId);
      if (path) navigate(path);
    },
    [topicId, navigate],
  );

  // Redirect bare /docs or incomplete /docs/<category>[/<section>] to first available doc.
  // Defer redirect until docs have loaded so we don't bounce to '/docs'.
  if (!parsed) {
    if (docs.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-[var(--color-muted-foreground)] text-sm">
          Loading…
        </div>
      );
    }
    return <Navigate to={getFirstDocPath()} replace />;
  }

  // Doc list still loading, no meta yet — show loading state.
  if (!meta) {
    if (loading || docs.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-[var(--color-muted-foreground)] text-sm">
          Loading…
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-muted-foreground)] text-sm">
        Page not found. Check the sidebar for available content.
      </div>
    );
  }

  // Content not yet fetched (or fetching a different slug).
  const contentReady = activeContent && activeContent.slug === slug;

  const tocEntries = meta?.toc_json ?? [];
  const hasToc = tocEntries.length > 0;

  const leftPane = (
    <div className="min-w-0">
      <ProgressBar pageUrl={pathname} />
      <div className="flex justify-end items-center gap-1 px-4 pt-2">
        <AnnotationToggle />
        {hasToc && (
          <button
            onClick={toggleToc}
            aria-label="Toggle table of contents"
            title={showToc ? 'Hide table of contents' : 'Show table of contents'}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
          >
            {showToc ? <List size={14} /> : <ListX size={14} />}
          </button>
        )}
      </div>
      <div className="max-w-5xl mx-auto px-6 py-4 flex gap-6">
        <article className="prose flex-1 min-w-0">
          {contentReady ? (
            <RuntimeMdx source={activeContent.content_md} />
          ) : (
            <div className="text-[var(--color-muted-foreground)] text-sm">Loading…</div>
          )}
        </article>
        {showToc && hasToc && (
          <aside className="hidden lg:block w-56 shrink-0 sticky top-[calc(56px+36px+8px)] self-start">
            <TOCPanel toc={tocEntries} />
          </aside>
        )}
      </div>
      <DocNav currentPath={pathname} />
      <AnnotationLayer pageUrl={meta.id} topicId={topicId} />
    </div>
  );

  const rightPane = (
    <div
      className="relative self-start h-full"
      style={{
        position: 'sticky',
        top: 'calc(56px + 36px)',
        height: 'calc(100dvh - 56px - 36px)',
        touchAction: 'none',
      }}
    >
      <MapCanvas topicId={topicId} onAnnotationJump={handleMapNodeClick} onNodeDoubleClick={handleMapNodeDoubleClick} />
      {showStagingInbox && <StagingInbox topicId={topicId} />}
    </div>
  );

  return <WorkspaceLayout left={leftPane} right={rightPane} />;
}
