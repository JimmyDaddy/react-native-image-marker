import { access, readFile, readdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const outputRoot = resolve(readArgument('--dir') || 'versioned-dist');
const requiredFiles = [
  'index.html',
  'getting-started/index.html',
  'v1/index.html',
  'v1/getting-started/index.html',
  'v1/api/index.html',
  'next/index.html',
  'next/getting-started/index.html',
  'next/api/index.html',
  'versions/1.0.0/index.html',
  'editor/index.html',
  'versions.json',
  'build-manifest.json',
];

for (const relativePath of requiredFiles) {
  await access(join(outputRoot, relativePath));
}

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectHtml(path)));
    else if (extname(path) === '.html') files.push(path);
  }
  return files;
}

const v1Home = await readFile(join(outputRoot, 'v1/index.html'), 'utf8');
const nextHome = await readFile(join(outputRoot, 'next/index.html'), 'utf8');
const archive = await readFile(
  join(outputRoot, 'versions/1.0.0/index.html'),
  'utf8'
);
const editor = await readFile(join(outputRoot, 'editor/index.html'), 'utf8');
const versions = JSON.parse(
  await readFile(join(outputRoot, 'versions.json'), 'utf8')
);
const buildManifest = JSON.parse(
  await readFile(join(outputRoot, 'build-manifest.json'), 'utf8')
);

for (const fragment of [
  '/v1/getting-started/',
  '/v1/tools/',
  'edit/release/1.x/website/',
]) {
  if (!v1Home.includes(fragment)) {
    throw new Error(`v1 documentation is missing versioned fragment: ${fragment}`);
  }
}
for (const fragment of [
  '/next/getting-started/',
  '/next/tools/',
  'edit/master/website/',
]) {
  if (!nextHome.includes(fragment)) {
    throw new Error(`v2 preview is missing versioned fragment: ${fragment}`);
  }
}
if (!archive.includes(buildManifest.sources.archive.sha)) {
  throw new Error('v1.0.0 archive page does not expose its immutable source SHA.');
}
if (
  !editor.includes('react-native-image-marker-editor@0.0.1') ||
  !editor.includes('react-native-image-marker@^2.0.0')
) {
  throw new Error('Editor page does not expose the initial version contract.');
}
if (
  versions.current !== 'v1' ||
  !versions.versions.some(
    (version) =>
      version.id === 'v1' &&
      version.source === 'release/1.x' &&
      version.status === 'lts'
  )
) {
  throw new Error('Version manifest does not declare v1 LTS as current.');
}

for (const namespace of ['v1', 'next']) {
  const namespaceRoot = join(outputRoot, namespace);
  for (const file of await collectHtml(namespaceRoot)) {
    const html = await readFile(file, 'utf8');
    const invalidRootLink = html.match(
      /(?:href|src|action)=["']\/(?!\/|v1\/|next\/|editor\/|versions\/)/
    );
    if (invalidRootLink) {
      throw new Error(
        `${file.slice(outputRoot.length)} escapes its version namespace: ${invalidRootLink[0]}`
      );
    }
  }
}

process.stdout.write(
  `Verified ${requiredFiles.length} versioned site artifacts and source contracts.\n`
);
