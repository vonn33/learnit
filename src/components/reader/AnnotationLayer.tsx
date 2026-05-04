import {useEffect, useRef, useState} from 'react';
import {useTagStore} from '@/store/tagStore';
import {applyHighlightsToDOM} from '@/lib/highlights';
import {BubbleToolbar} from './BubbleToolbar';
import {MobileAnnotationSheet} from './MobileAnnotationSheet';
import {NotePanel} from './NotePanel';
import {NoteTooltip} from './NoteTooltip';
import {useAnnotationStore} from '@/store/annotationStore';

const isCoarsePointer =
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches;

interface AnnotationLayerProps {
  pageUrl: string;
  topicId?: string;
}

export function AnnotationLayer({pageUrl, topicId}: AnnotationLayerProps) {
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [markRect, setMarkRect] = useState<DOMRect | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteDotRect, setNoteDotRect] = useState<DOMRect | null>(null);
  const appliedRef = useRef(false);
  const showAnnotations = useAnnotationStore((s) => s.showAnnotations);
  const annotations = useAnnotationStore((s) => s.annotations);
  const tags = useTagStore((s) => s.tags);

  // Re-apply marks whenever annotations or page changes
  useEffect(() => {
    appliedRef.current = false;
    const pageAnnotations = annotations.filter((a) => a.docId === pageUrl);

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

      if (showAnnotations && pageAnnotations.length > 0) {
        applyHighlightsToDOM(pageAnnotations, container, tags);
      }
      appliedRef.current = true;

      // Scroll to and pulse a specific annotation if the URL hash targets one.
      // Consume the hash immediately so re-renders from new annotations don't re-trigger.
      const hash = window.location.hash;
      if (hash.startsWith('#annotation-')) {
        const annotationId = hash.slice('#annotation-'.length);
        history.replaceState(null, '', window.location.pathname + window.location.search);
        requestAnimationFrame(() => {
          const mark = container.querySelector(
            `mark[data-annotation-id="${annotationId}"]`,
          );
          if (mark) {
            mark.scrollIntoView({behavior: 'smooth', block: 'center'});
            mark.classList.add('handbook-highlight-pulse');
            setTimeout(() => mark.classList.remove('handbook-highlight-pulse'), 1500);
          }
        });
      }

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
  }, [pageUrl, showAnnotations, annotations, tags]);

  // Click handler: mark clicks → NotePanel; note-dot clicks → NoteTooltip
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const dot = (e.target as HTMLElement).closest(
        'span.handbook-note-dot[data-highlight-id]',
      ) as HTMLElement | null;
      if (dot?.dataset.highlightId) {
        setNoteDotRect(dot.getBoundingClientRect());
        setActiveNoteId(dot.dataset.highlightId);
        setActiveAnnotationId(null);
        return;
      }

      const mark = (e.target as HTMLElement).closest(
        'mark[data-highlight-id]',
      ) as HTMLElement | null;
      if (mark?.dataset.annotationId) {
        const id = mark.dataset.annotationId;
        setMarkRect(mark.getBoundingClientRect());
        setActiveAnnotationId(id);
        setActiveNoteId(null);

        const annotation = useAnnotationStore.getState().annotations.find((a) => a.id === id);
        if (annotation?.mapNodeId) {
          window.dispatchEvent(
            new CustomEvent('focus-map-node', {detail: {nodeId: annotation.mapNodeId}}),
          );
        }
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    if (!isCoarsePointer) return;
    function suppress(e: Event) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('article.prose')) e.preventDefault();
    }
    document.addEventListener('contextmenu', suppress);
    return () => document.removeEventListener('contextmenu', suppress);
  }, []);

  return (
    <>
      {isCoarsePointer ? (
        <MobileAnnotationSheet pageUrl={pageUrl} topicId={topicId} />
      ) : (
        <BubbleToolbar pageUrl={pageUrl} topicId={topicId} />
      )}
      {activeAnnotationId && (
        <NotePanel
          annotationId={activeAnnotationId}
          topicId={topicId}
          anchorRect={markRect}
          tags={tags}
          onClose={() => setActiveAnnotationId(null)}
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
            setActiveAnnotationId(null);
          }}
        />
      )}
      {activeNoteId && noteDotRect && (
        <NoteTooltip
          annotationId={activeNoteId}
          anchorRect={noteDotRect}
          onClose={() => setActiveNoteId(null)}
          onEdit={() => {
            const mark = document.querySelector(
              `mark[data-highlight-id="${activeNoteId}"]`,
            ) as HTMLElement | null;
            setMarkRect(mark?.getBoundingClientRect() ?? noteDotRect);
            setActiveAnnotationId(activeNoteId);
            setActiveNoteId(null);
          }}
        />
      )}
    </>
  );
}
