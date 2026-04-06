import type {DiagramNode, DiagramEdge} from './diagrams';

const H_GAP = 200;
const V_GAP = 100;

/**
 * Simple left-to-right force-free layout: groups nodes into columns
 * based on topological depth from root nodes (those with no incoming edges).
 */
export function autoLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
): DiagramNode[] {
  if (nodes.length === 0) return nodes;

  const incomingCount = new Map<string, number>();
  for (const n of nodes) incomingCount.set(n.id, 0);
  for (const e of edges) {
    incomingCount.set(e.target, (incomingCount.get(e.target) ?? 0) + 1);
  }

  const depths = new Map<string, number>();
  const queue = nodes.filter((n) => (incomingCount.get(n.id) ?? 0) === 0);
  for (const n of queue) depths.set(n.id, 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const depth = depths.get(current.id) ?? 0;
    const children = edges
      .filter((e) => e.source === current.id)
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter(Boolean) as DiagramNode[];

    for (const child of children) {
      const existing = depths.get(child.id) ?? -1;
      if (depth + 1 > existing) {
        depths.set(child.id, depth + 1);
        queue.push(child);
      }
    }
  }

  // Nodes without depth assigned (disconnected): put at depth 0
  for (const n of nodes) {
    if (!depths.has(n.id)) depths.set(n.id, 0);
  }

  // Group by depth and compute positions
  const byDepth = new Map<number, DiagramNode[]>();
  for (const n of nodes) {
    const d = depths.get(n.id) ?? 0;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(n);
  }

  const positioned = new Map<string, {x: number; y: number}>();
  for (const [depth, group] of byDepth) {
    const x = depth * H_GAP;
    group.forEach((n, i) => {
      positioned.set(n.id, {x, y: i * V_GAP});
    });
  }

  return nodes.map((n) => ({
    ...n,
    position: positioned.get(n.id) ?? n.position,
  }));
}
