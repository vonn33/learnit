import {describe, it, expect, beforeEach} from 'vitest';
import {useAnnotationStore} from '@/store/annotationStore';
import {useMapStore} from '@/store/mapStore';

beforeEach(() => {
  useAnnotationStore.getState().reset();
  useMapStore.getState().reset();
});

describe('connect-to-node store interactions', () => {
  it('links annotation to map node (both stores updated)', () => {
    const annotationId = useAnnotationStore.getState().addAnnotation({
      docId: 'doc-1',
      position: {start: 0, end: 10},
      type: 'highlight',
      text: 'test selection',
    });
    useMapStore.getState().initMap('topic-1');
    const nodeId = useMapStore.getState().addNode('topic-1', {
      label: 'Test Node',
      type: 'concept',
      status: 'placed',
      position: {x: 100, y: 100},
    });

    // Simulate NotePanel handleConnect
    useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId});
    useMapStore.getState().updateNode('topic-1', nodeId, {annotationId});

    const annotation = useAnnotationStore.getState().annotations[0];
    const node = useMapStore.getState().maps['topic-1'].nodes[0];
    expect(annotation.mapNodeId).toBe(nodeId);
    expect(node.annotationId).toBe(annotationId);
  });

  it('disconnects annotation from map node (both stores cleared)', () => {
    const annotationId = useAnnotationStore.getState().addAnnotation({
      docId: 'doc-1',
      position: {start: 0, end: 10},
      type: 'highlight',
      text: 'test',
    });
    useMapStore.getState().initMap('topic-1');
    const nodeId = useMapStore.getState().addNode('topic-1', {
      label: 'Node',
      type: 'concept',
      status: 'placed',
      position: {x: 0, y: 0},
    });
    useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId});
    useMapStore.getState().updateNode('topic-1', nodeId, {annotationId});

    // Simulate NotePanel handleDisconnect
    useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: undefined});
    useMapStore.getState().updateNode('topic-1', nodeId, {annotationId: undefined});

    const annotation = useAnnotationStore.getState().annotations[0];
    const node = useMapStore.getState().maps['topic-1'].nodes[0];
    expect(annotation.mapNodeId).toBeUndefined();
    expect(node.annotationId).toBeUndefined();
  });

  it('can reconnect to a different node', () => {
    const annotationId = useAnnotationStore.getState().addAnnotation({
      docId: 'doc-1',
      position: {start: 0, end: 10},
      type: 'highlight',
      text: 'test',
    });
    useMapStore.getState().initMap('topic-1');
    const nodeId1 = useMapStore.getState().addNode('topic-1', {
      label: 'Node A',
      type: 'concept',
      status: 'placed',
      position: {x: 0, y: 0},
    });
    const nodeId2 = useMapStore.getState().addNode('topic-1', {
      label: 'Node B',
      type: 'concept',
      status: 'placed',
      position: {x: 200, y: 0},
    });

    useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId1});
    useMapStore.getState().updateNode('topic-1', nodeId1, {annotationId});

    // Reconnect to node 2
    useAnnotationStore.getState().updateAnnotation(annotationId, {mapNodeId: nodeId2});
    useMapStore.getState().updateNode('topic-1', nodeId1, {annotationId: undefined});
    useMapStore.getState().updateNode('topic-1', nodeId2, {annotationId});

    expect(useAnnotationStore.getState().annotations[0].mapNodeId).toBe(nodeId2);
    expect(useMapStore.getState().maps['topic-1'].nodes.find((n) => n.id === nodeId1)?.annotationId).toBeUndefined();
    expect(useMapStore.getState().maps['topic-1'].nodes.find((n) => n.id === nodeId2)?.annotationId).toBe(annotationId);
  });
});
