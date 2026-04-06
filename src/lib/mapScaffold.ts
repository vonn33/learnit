interface ManifestSection {
  label: string;
  link: string;
  docs: string[];
}

interface ManifestCategory {
  label: string;
  link: string;
  sections: Record<string, ManifestSection>;
}

type Manifest = Record<string, ManifestCategory>;

export interface ScaffoldNode {
  label: string;
  type: 'structural';
}

export function generateScaffold(
  manifest: Manifest,
  categoryId: string,
): ScaffoldNode[] {
  const category = manifest[categoryId];
  if (!category) return [];

  const nodes: ScaffoldNode[] = [];

  for (const section of Object.values(category.sections)) {
    nodes.push({ label: section.label, type: 'structural' });
    for (const doc of section.docs) {
      nodes.push({ label: doc, type: 'structural' });
    }
  }

  return nodes;
}
