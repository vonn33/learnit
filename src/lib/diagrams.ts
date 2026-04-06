import {type DiagramLayouts, getDiagramLayout, saveDiagramLayout} from './storage';

export type DiagramNode = {
  id: string;
  position: {x: number; y: number};
  data: {label: string};
  type?: string;
};

export type DiagramEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type DiagramData = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

/**
 * Load a diagram: user's saved layout takes priority over the default JSON.
 */
export function loadDiagram(
  pageId: string,
  defaultData: DiagramData,
): DiagramData {
  const saved = getDiagramLayout(pageId);
  if (saved) {
    // Merge saved positions into default nodes (preserves labels from default)
    const posMap = new Map(saved.nodes.map((n) => [n.id, n.position]));
    return {
      nodes: defaultData.nodes.map((n) => ({
        ...n,
        position: posMap.get(n.id) ?? n.position,
      })),
      edges: defaultData.edges,
    };
  }
  return defaultData;
}

export function saveLayout(pageId: string, nodes: DiagramNode[], edges: DiagramEdge[]): void {
  saveDiagramLayout(pageId, {nodes, edges});
}

export function resetLayout(pageId: string): void {
  const all = JSON.parse(localStorage.getItem('handbook:diagram-layouts') ?? '{}') as DiagramLayouts;
  delete all[pageId];
  localStorage.setItem('handbook:diagram-layouts', JSON.stringify(all));
}
