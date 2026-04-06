import type {DiagramNode, DiagramEdge} from '@/lib/diagrams';

export type DiagramPreset = {
  id: string;
  label: string;
  description: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

export const DIAGRAM_PRESETS: DiagramPreset[] = [
  {
    id: 'comparison',
    label: 'Comparison',
    description: 'Compare two concepts side by side',
    nodes: [
      {id: 'a', position: {x: 0, y: 100}, data: {label: 'Concept A'}},
      {id: 'b', position: {x: 300, y: 100}, data: {label: 'Concept B'}},
      {id: 'shared', position: {x: 150, y: 250}, data: {label: 'Shared aspect'}},
    ],
    edges: [
      {id: 'ea', source: 'a', target: 'shared'},
      {id: 'eb', source: 'b', target: 'shared'},
    ],
  },
  {
    id: 'hierarchy',
    label: 'Hierarchy',
    description: 'Top-down tree structure',
    nodes: [
      {id: 'root', position: {x: 150, y: 0}, data: {label: 'Root'}},
      {id: 'child1', position: {x: 0, y: 150}, data: {label: 'Child 1'}},
      {id: 'child2', position: {x: 200, y: 150}, data: {label: 'Child 2'}},
      {id: 'leaf1', position: {x: 0, y: 300}, data: {label: 'Leaf'}},
    ],
    edges: [
      {id: 'e1', source: 'root', target: 'child1'},
      {id: 'e2', source: 'root', target: 'child2'},
      {id: 'e3', source: 'child1', target: 'leaf1'},
    ],
  },
  {
    id: 'process-flow',
    label: 'Process Flow',
    description: 'Sequential steps in a process',
    nodes: [
      {id: 's1', position: {x: 0, y: 0}, data: {label: 'Step 1'}},
      {id: 's2', position: {x: 200, y: 0}, data: {label: 'Step 2'}},
      {id: 's3', position: {x: 400, y: 0}, data: {label: 'Step 3'}},
      {id: 's4', position: {x: 600, y: 0}, data: {label: 'Step 4'}},
    ],
    edges: [
      {id: 'e1', source: 's1', target: 's2'},
      {id: 'e2', source: 's2', target: 's3'},
      {id: 'e3', source: 's3', target: 's4'},
    ],
  },
  {
    id: 'mind-map',
    label: 'Mind Map',
    description: 'Central idea with radiating branches',
    nodes: [
      {id: 'center', position: {x: 200, y: 200}, data: {label: 'Central Idea'}},
      {id: 'b1', position: {x: 0, y: 50}, data: {label: 'Branch 1'}},
      {id: 'b2', position: {x: 400, y: 50}, data: {label: 'Branch 2'}},
      {id: 'b3', position: {x: 0, y: 350}, data: {label: 'Branch 3'}},
      {id: 'b4', position: {x: 400, y: 350}, data: {label: 'Branch 4'}},
    ],
    edges: [
      {id: 'e1', source: 'center', target: 'b1'},
      {id: 'e2', source: 'center', target: 'b2'},
      {id: 'e3', source: 'center', target: 'b3'},
      {id: 'e4', source: 'center', target: 'b4'},
    ],
  },
  {
    id: 'cause-effect',
    label: 'Cause & Effect',
    description: 'Fishbone / Ishikawa diagram',
    nodes: [
      {id: 'effect', position: {x: 500, y: 150}, data: {label: 'Effect'}},
      {id: 'c1', position: {x: 200, y: 0}, data: {label: 'Cause 1'}},
      {id: 'c2', position: {x: 200, y: 150}, data: {label: 'Cause 2'}},
      {id: 'c3', position: {x: 200, y: 300}, data: {label: 'Cause 3'}},
    ],
    edges: [
      {id: 'e1', source: 'c1', target: 'effect'},
      {id: 'e2', source: 'c2', target: 'effect'},
      {id: 'e3', source: 'c3', target: 'effect'},
    ],
  },
  {
    id: 'timeline',
    label: 'Timeline',
    description: 'Events in chronological order',
    nodes: [
      {id: 't1', position: {x: 0, y: 0}, data: {label: 'Event 1'}},
      {id: 't2', position: {x: 180, y: 0}, data: {label: 'Event 2'}},
      {id: 't3', position: {x: 360, y: 0}, data: {label: 'Event 3'}},
      {id: 't4', position: {x: 540, y: 0}, data: {label: 'Event 4'}},
    ],
    edges: [
      {id: 'e1', source: 't1', target: 't2'},
      {id: 'e2', source: 't2', target: 't3'},
      {id: 'e3', source: 't3', target: 't4'},
    ],
  },
];
