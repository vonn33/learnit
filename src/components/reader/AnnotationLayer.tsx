import {useEffect, useRef, useState} from 'react';
import {getHighlightsForPage, getTags} from '@/lib/storage';
import {applyHighlightsToDOM} from '@/lib/highlights';
import {BubbleToolbar} from './BubbleToolbar';
import {NotePanel} from './NotePanel';
import {NoteTooltip} from './NoteTooltip';
import {useAnnotationStore} from '@/store/annotationStore';

interface AnnotationLayerProps {
  pageUrl: string;
  topicId?: string;
}

export function AnnotationLayer({pageUrl, topicId}: AnnotationLayerProps) {
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [markRect, setMarkRect] = useState<DOMRect | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteDotRect, setNoteDotRect] = useState<DOMRect | null>(null);
  const appliedRef = useRef(false);
  const showAnnotations = useAnnotationStore((s) => s.showAnnotations);

  // Apply highlights to DOM after content renders
  useEffect(() => {
    appliedRef.current = false;
    const tags = getTags();

    const tryApply = () => {
      const container = document.querySelector('article.prose') as HTMLElement | null;
      if (!container) return false;

      container.querySelectorAll('mark[data-highlight-id]').forEach((mark) => {
        const parent = mark.parentNode;
        while (mark.firstChild) parent?.insertBefore(mark.firstChild, mark);
        parent?.removeChild(mark);
        parent?.normalize();
      });
      container.querySelectorAll('span.handbook-note-dot').forEach((dot) => dot.remove());

      if (showAnnotations) {
        const highlights = getHighlightsForPage(pageUrl);
        if (highlights.length > 0) applyHighlightsToDOM(highlights, container, tags);
      }
      appliedRef.current = true;
      return true;
    };

    if (tryApply()) return;

    const interval = setInterval(() => {
      if (tryApply()) clearInterval(interval);
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      tryApply();
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pageUrl, showAnnotations]);

  // Click handler: mark clicks → NotePanel; note-dot clicks → NoteTooltip
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const dot = (e.target as HTMLElement).closest(
        'span.handbook-note-dot[data-highlight-id]',
      ) as HTMLElement | null;
      if (dot?.dataset.highlightId) {
        setNoteDotRect(dot.getBoundingClientRect());
        setActiveNoteId(dot.dataset.highlightId);
        setActiveHighlightId(null);
        return;
      }

      const mark = (e.target as HTMLElement).closest(
        'mark[data-highlight-id]',
      ) as HTMLElement | null;
      if (mark?.dataset.highlightId) {
        const id = mark.dataset.highlightId;
        setMarkRect(mark.getBoundingClientRect());
        setActiveHighlightId(id);
        setActiveNoteId(null);
        setActiveAnnotationId(mark.dataset.annotationId ?? null);

        const annotationId = mark.dataset.annotationId;
        if (annotationId) {
          const annotation = useAnnotationStore
            .getState()
            .annotations.find((a) => a.id === annotationId);
          if (annotation?.mapNodeId) {
            window.dispatchEvent(
              new CustomEvent('focus-map-node', {detail: {nodeId: annotation.mapNodeId}}),
            );
          }
        }
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function reapplyHighlights() {
    const tags = getTags();
    const container = document.querySelector('article.prose') as HTMLElement | null;
    if (container) {
      // Strip existing marks before re-applying to avoid double-wrap
      container.querySelectorAll('mark[data-highlight-id]').forEach((mark) => {
        const parent = mark.parentNode;
        while (mark.firstChild) parent?.insertBefore(mark.firstChild, mark);
        parent?.removeChild(mark);
        parent?.normalize();
      });
      container.querySelectorAll('span.handbook-note-dot').forEach((dot) => dot.remove());
      const highlights = getHighlightsForPage(pageUrl);
      applyHighlightsToDOM(highlights, container, tags);
    }
  }

  return (
    <>
      <BubbleToolbar
        pageUrl={pageUrl}
        topicId={topicId}
        onHighlightCreated={reapplyHighlights}
      />
      {activeHighlightId && (
        <NotePanel
          highlightId={activeHighlightId}
          annotationId={activeAnnotationId ?? undefined}
          topicId={topicId}
          anchorRect={markRect}
          tags={getTags()}
          onClose={() => {
            setActiveHighlightId(null);
            setActiveAnnotationId(null);
          }}
          onDelete={(id) => {
            const mark = document.querySelector(`mark[data-highlight-id="${id}"]`);
            if (mark) {
              const parent = mark.parentNode;
              while (mark.firstChild) parent?.insertBefore(mark.firstChild, mark);
              parent?.removeChild(mark);
              parent?.normalize();
            }
            const dot = document.querySelector(`span.handbook-note-dot[data-highlight-id="${id}"]`);
            dot?.remove();
            setActiveHighlightId(null);
          }}
        />
      )}
      {activeNoteId && noteDotRect && (
        <NoteTooltip
          highlightId={activeNoteId}
          anchorRect={noteDotRect}
          onClose={() => setActiveNoteId(null)}
          onEdit={() => {
            const mark = document.querySelector(
              `mark[data-highlight-id="${activeNoteId}"]`,
            ) as HTMLElement | null;
            setMarkRect(mark?.getBoundingClientRect() ?? noteDotRect);
            setActiveHighlightId(activeNoteId);
            setActiveNoteId(null);
          }}
        />
      )}
    </>
  );
}
