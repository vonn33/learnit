#!/usr/bin/env node
/**
 * learnit content ingest CLI
 * Usage: npm run ingest path/to/document.docx
 *
 * Converts a document via pandoc and places it into the docs/ tree
 * (shared with the source repo at ../learnit/docs/), then registers it
 * in src/data/content-manifest.json.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as os from 'os';
import {execSync, spawnSync} from 'child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const MANIFEST_PATH = path.join(ROOT, 'src/data/content-manifest.json');

// ── Helpers ───────────────────────────────────────────────────────────────────

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function titleCase(str: string): string {
  return str
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function checkPandoc(): boolean {
  const result = spawnSync('pandoc', ['--version'], {stdio: 'ignore'});
  return result.status === 0;
}

function convertWithPandoc(inputPath: string): string {
  const tmpOut = path.join(os.tmpdir(), `ingest-${Date.now()}.md`);
  execSync(`pandoc "${inputPath}" -o "${tmpOut}" --wrap=none`, {stdio: 'inherit'});
  const content = fs.readFileSync(tmpOut, 'utf8');
  fs.unlinkSync(tmpOut);
  return content;
}

function readManifest(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeManifest(manifest: Record<string, unknown>): void {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

function listDirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) =>
    fs.statSync(path.join(dir, f)).isDirectory(),
  );
}

function nextPosition(sectionDir: string): number {
  if (!fs.existsSync(sectionDir)) return 1;
  const mdxFiles = fs.readdirSync(sectionDir).filter((f) => f.endsWith('.mdx') && f !== 'index.mdx');
  return mdxFiles.length + 1;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const inputFile = process.argv[2];

  if (!inputFile) {
    console.error('Usage: npm run ingest <path/to/document>');
    console.error('Supported: .docx, .pdf, .txt, .md');
    process.exit(1);
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

  const ext = path.extname(inputFile).toLowerCase();
  const supportedExts = ['.docx', '.pdf', '.txt', '.md'];
  if (!supportedExts.includes(ext)) {
    console.error(`Unsupported file type: ${ext}`);
    console.error(`Supported: ${supportedExts.join(', ')}`);
    process.exit(1);
  }

  // Convert via pandoc
  let markdown: string;
  if (ext === '.md' || ext === '.txt') {
    markdown = fs.readFileSync(inputFile, 'utf8');
  } else {
    if (!checkPandoc()) {
      console.error('pandoc is not installed. Install: brew install pandoc');
      process.exit(1);
    }
    console.log('Converting with pandoc…');
    markdown = convertWithPandoc(inputFile);
    console.log('Done.\n');
  }

  const rl = readline.createInterface({input: process.stdin, output: process.stdout});

  // ── Prompts ───────────────────────────────────────────────────────────────

  const defaultTitle = titleCase(path.basename(inputFile, ext));
  const rawTitle = await ask(rl, `Title [${defaultTitle}]: `);
  const title = rawTitle.trim() || defaultTitle;
  const slug = slugify(title);

  // Project
  const existingProjects = listDirs(DOCS_DIR);
  console.log('\nProjects:');
  existingProjects.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  console.log(`  ${existingProjects.length + 1}. (new)`);
  const projectInput = await ask(rl, 'Project [1]: ');
  const projectIdx = parseInt(projectInput.trim()) - 1;
  let projectId: string;
  if (!projectInput.trim() || (projectIdx >= 0 && projectIdx < existingProjects.length)) {
    projectId = existingProjects[projectIdx >= 0 ? projectIdx : 0]!;
  } else {
    const newProject = await ask(rl, 'New project name: ');
    projectId = slugify(newProject.trim());
  }

  // Section
  const projectDir = path.join(DOCS_DIR, projectId);
  const existingSections = listDirs(projectDir);
  console.log('\nSections:');
  existingSections.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  console.log(`  ${existingSections.length + 1}. (new)`);
  const sectionInput = await ask(rl, 'Section [1]: ');
  const sectionIdx = parseInt(sectionInput.trim()) - 1;
  let sectionId: string;
  if (!sectionInput.trim() || (sectionIdx >= 0 && sectionIdx < existingSections.length)) {
    sectionId = existingSections[sectionIdx >= 0 ? sectionIdx : 0]!;
  } else {
    const newSection = await ask(rl, 'New section name: ');
    sectionId = slugify(newSection.trim());
  }

  // Position
  const sectionDir = path.join(projectDir, sectionId);
  const autoPos = nextPosition(sectionDir);
  const posInput = await ask(rl, `Position in section [${autoPos}]: `);
  const position = parseInt(posInput.trim()) || autoPos;

  const description = (await ask(rl, 'Description (optional): ')).trim();

  rl.close();

  // ── Write MDX ─────────────────────────────────────────────────────────────

  const frontmatter = [
    '---',
    `title: "${title}"`,
    `sidebar_position: ${position}`,
    description ? `description: "${description}"` : null,
    '---',
    '',
  ]
    .filter((l) => l !== null)
    .join('\n');

  const outputPath = path.join(sectionDir, `${slug}.mdx`);
  fs.mkdirSync(sectionDir, {recursive: true});
  fs.writeFileSync(outputPath, frontmatter + markdown, 'utf8');

  // ── Update content-manifest.json ─────────────────────────────────────────

  const manifest = readManifest() as Record<string, {
    label: string;
    link: string;
    sections: Record<string, {label: string; link: string; docs: string[]}>;
  }>;

  if (!manifest[projectId]) {
    manifest[projectId] = {
      label: titleCase(projectId),
      link: `${projectId}/index`,
      sections: {},
    };
  }

  if (!manifest[projectId]!.sections[sectionId]) {
    manifest[projectId]!.sections[sectionId] = {
      label: titleCase(sectionId),
      link: `${projectId}/${sectionId}/index`,
      docs: [],
    };
  }

  const docs = manifest[projectId]!.sections[sectionId]!.docs;
  if (!docs.includes(slug)) {
    docs.splice(position - 1, 0, slug);
  }

  writeManifest(manifest as Record<string, unknown>);

  // ── Summary ───────────────────────────────────────────────────────────────

  const relPath = path.relative(ROOT, outputPath);
  console.log(`\nCreated: ${relPath}`);
  console.log('Updated: src/data/content-manifest.json\n');
  console.log('Next steps:');
  console.log('  1. Review tables → convert to <DataTable headers={[...]} rows={[...]} />');
  console.log('  2. Add components: <Verdict type="strong" label="...">, <Callout>, <Compare>');
  console.log('  3. Optionally: create static/diagrams/' + slug + '.diagram.json');
  console.log('  4. npm run dev — page appears in sidebar immediately\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
