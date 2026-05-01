import { describe, it, expect, beforeEach } from 'vitest';
import { useAnnotationStore } from '@/store/annotationStore';

beforeEach(() => {
  useAnnotationStore.getState().reset();
});

describe('useAnnotationStore', () => {
  it('starts with empty annotations', () => {
    const { annotations } = useAnnotationStore.getState();
    expect(annotations).toEqual([]);
  });

  it('adds a highlight annotation', () => {
    const { addAnnotation } = useAnnotationStore.getState();
    addAnnotation({
      docId: 'language-learning/handbook/part-1a-fluent-forever',
      position: { start: 100, end: 150 },
      type: 'highlight',
      text: 'spaced repetition',
    });

    const { annotations } = useAnnotationStore.getState();
    expect(annotations).toHaveLength(1);
    expect(annotations[0].type).toBe('highlight');
    expect(annotations[0].text).toBe('spaced repetition');
    expect(annotations[0].id).toBeDefined();
    expect(annotations[0].createdAt).toBeDefined();
  });

  it('adds a quick-capture annotation', () => {
    const { addAnnotation } = useAnnotationStore.getState();
    addAnnotation({
      docId: 'doc-1',
      position: { start: 0, end: 10 },
      type: 'quick-capture',
      text: 'important concept',
    });

    const { annotations } = useAnnotationStore.getState();
    expect(annotations[0].type).toBe('quick-capture');
  });

  it('updates an annotation', () => {
    const { addAnnotation } = useAnnotationStore.getState();
    addAnnotation({
      docId: 'doc-1',
      position: { start: 0, end: 10 },
      type: 'highlight',
      text: 'test',
    });

    const id = useAnnotationStore.getState().annotations[0].id;
    useAnnotationStore.getState().updateAnnotation(id, {
      note: 'this is key',
      mapNodeId: 'node-1',
    });

    const updated = useAnnotationStore.getState().annotations[0];
    expect(updated.note).toBe('this is key');
    expect(updated.mapNodeId).toBe('node-1');
  });

  it('removes an annotation', () => {
    const { addAnnotation } = useAnnotationStore.getState();
    addAnnotation({
      docId: 'doc-1',
      position: { start: 0, end: 10 },
      type: 'highlight',
      text: 'test',
    });

    const id = useAnnotationStore.getState().annotations[0].id;
    useAnnotationStore.getState().removeAnnotation(id);
    expect(useAnnotationStore.getState().annotations).toHaveLength(0);
  });

  it('queries annotations by docId', () => {
    const { addAnnotation } = useAnnotationStore.getState();
    addAnnotation({ docId: 'doc-1', position: { start: 0, end: 5 }, type: 'highlight', text: 'a' });
    addAnnotation({ docId: 'doc-2', position: { start: 0, end: 5 }, type: 'highlight', text: 'b' });
    addAnnotation({ docId: 'doc-1', position: { start: 10, end: 15 }, type: 'note', text: 'c' });

    const doc1 = useAnnotationStore.getState().getAnnotationsForDoc('doc-1');
    expect(doc1).toHaveLength(2);
  });

  it('toggles annotation visibility', () => {
    expect(useAnnotationStore.getState().showAnnotations).toBe(true);
    useAnnotationStore.getState().toggleAnnotations();
    expect(useAnnotationStore.getState().showAnnotations).toBe(false);
  });
});

describe('unified annotation fields', () => {
  it('addAnnotation stores anchorContext, tagIds, and connectionUrl', () => {
    const store = useAnnotationStore.getState();
    const id = store.addAnnotation({
      docId: '/docs/test/page',
      type: 'highlight',
      text: 'selected text',
      anchorContext: 'before|||selected text|||after',
      tagIds: ['tag-1'],
      note: 'my note',
      connectionUrl: 'https://example.com',
    });
    const a = useAnnotationStore.getState().annotations.find((x) => x.id === id)!;
    expect(a.anchorContext).toBe('before|||selected text|||after');
    expect(a.tagIds).toEqual(['tag-1']);
    expect(a.connectionUrl).toBe('https://example.com');
  });

  it('updateAnnotation can patch tagIds and connectionUrl', () => {
    const store = useAnnotationStore.getState();
    const id = store.addAnnotation({
      docId: '/docs/test',
      type: 'highlight',
      text: 'text',
      anchorContext: '|||text|||',
      tagIds: [],
      note: '',
      connectionUrl: '',
    });
    store.updateAnnotation(id, {tagIds: ['t1', 't2'], connectionUrl: '/docs/other'});
    const a = useAnnotationStore.getState().annotations.find((x) => x.id === id)!;
    expect(a.tagIds).toEqual(['t1', 't2']);
    expect(a.connectionUrl).toBe('/docs/other');
  });

  it('removeAnnotation removes record completely with no ghost', () => {
    const store = useAnnotationStore.getState();
    const id = store.addAnnotation({
      docId: '/docs/test',
      type: 'highlight',
      text: 'text',
      anchorContext: '|||text|||',
      tagIds: [],
      note: '',
      connectionUrl: '',
    });
    store.removeAnnotation(id);
    const found = useAnnotationStore.getState().annotations.find((x) => x.id === id);
    expect(found).toBeUndefined();
  });
});
