import {useEffect, useRef, useState} from 'react';
import {getHighlightsForPage, getTags} from '@/lib/storage';
import {applyHighlightsToDOM} from '@/lib/highlights';
import {HighlightPopover} from './HighlightPopover';
import {NotePanel} from './NotePanel';
import { useAnnotationStore } from '@/store/annotationStore';

interface AnnotationLayerProps {
  pageUrl: string;
}

export function AnnotationLayer({pageUrl}: AnnotationLayerProps) {
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [markRect, setMarkRect] = useState<DOMRect | null>(null);
  const appliedRef = useRef(false);
  const showAnnotations = useAnnotationStore((s) => s.showAnnotations);

  // Apply highlights to DOM after content renders
  useEffect(() => {
    appliedRef.current = false;
    const tags = getTags();

    const tryApply = () => {
      const container = document.querySelector('article.prose') as HTMLElement | null;
      if (!container) return false;

      // Clear existing marks first
      container.querySelectorAll('mark[data-highlight-id]').forEach((mark) => {
        const parent = mark.parentNode;
        while (mark.firstChild) parent?.insertBefore(mark.firstChild, mark);
        parent?.removeChild(mark);
        parent?.normalize();
      });

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

  // Click on highlight mark → open NotePanel
  useEffect(() => {
    function onHighlightClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('mark[data-highlight-id]') as HTMLElement | null;
      if (!target) return;
      const id = target.dataset.highlightId;
      if (!id) return;
      setMarkRect(target.getBoundingClientRect());
      setActiveHighlightId(id);
    }
    document.addEventListener('click', onHighlightClick);
    return () => document.removeEventListener('click', onHighlightClick);
  }, []);

  return (
    <>
      <HighlightPopover
        pageUrl={pageUrl}
        onHighlightCreated={() => {
          const tags = getTags();
          const container = document.querySelector('article.prose') as HTMLElement | null;
          if (container) {
            const highlights = getHighlightsForPage(pageUrl);
            applyHighlightsToDOM(highlights, container, tags);
          }
        }}
      />
      {activeHighlightId && (
        <NotePanel
          highlightId={activeHighlightId}
          anchorRect={markRect}
          tags={getTags()}
          onClose={() => setActiveHighlightId(null)}
          onDelete={(id) => {
            const mark = document.querySelector(`mark[data-highlight-id="${id}"]`);
            if (mark) {
              const parent = mark.parentNode;
              while (mark.firstChild) parent?.insertBefore(mark.firstChild, mark);
              parent?.removeChild(mark);
              parent?.normalize();
            }
            setActiveHighlightId(null);
          }}
        />
      )}
    </>
  );
}
