import { access, readFile, readdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const outputRoot = resolve(readArgument('--dir') || 'versioned-dist');
const alwaysRequiredFiles = [
  'index.html',
  'v1/index.html',
  'v1/getting-started/index.html',
  'v1/api/index.html',
  'versions/1.0.0/index.html',
  'editor/index.html',
  'editor/zh-cn/index.html',
  'versions.json',
  'build-manifest.json',
];

for (const relativePath of alwaysRequiredFiles) {
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
const archive = await readFile(
  join(outputRoot, 'versions/1.0.0/index.html'),
  'utf8'
);
const editor = await readFile(join(outputRoot, 'editor/index.html'), 'utf8');
const editorZh = await readFile(
  join(outputRoot, 'editor/zh-cn/index.html'),
  'utf8'
);
const versions = JSON.parse(
  await readFile(join(outputRoot, 'versions.json'), 'utf8')
);
const isGa = versions.releaseStage === 'ga';
const v2Namespace = isGa ? 'v2' : 'next';
const stageRequiredFiles = isGa
  ? [
      'getting-started/index.html',
      'v2/index.html',
      'v2/getting-started/index.html',
      'v2/api/index.html',
      'next/index.html',
    ]
  : [
      'getting-started/index.html',
      'next/index.html',
      'next/getting-started/index.html',
      'next/api/index.html',
    ];
for (const relativePath of stageRequiredFiles) {
  await access(join(outputRoot, relativePath));
}

const buildManifest = JSON.parse(
  await readFile(join(outputRoot, 'build-manifest.json'), 'utf8')
);
const v2Home = await readFile(
  join(outputRoot, v2Namespace, 'index.html'),
  'utf8'
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
  `/${v2Namespace}/getting-started/`,
  `/${v2Namespace}/tools/`,
  'edit/master/website/',
]) {
  if (!v2Home.includes(fragment)) {
    throw new Error(`v2 documentation is missing versioned fragment: ${fragment}`);
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
  !editor.includes(`/${v2Namespace}/guides/editor/`) ||
  !editorZh.includes(`/${v2Namespace}/zh-cn/guides/editor/`)
) {
  throw new Error('Editor pages do not expose localized integration guides.');
}
if (versions.current !== (isGa ? 'v2' : 'v1')) {
  throw new Error('Version manifest current release does not match its stage.');
}
if (
  !versions.versions.some(
    (version) =>
      version.id === 'v1' &&
      version.source === 'release/1.x' &&
      version.status === 'lts'
  )
) {
  throw new Error('Version manifest does not preserve v1 LTS.');
}

if (isGa) {
  const neutralHome = await readFile(join(outputRoot, 'index.html'), 'utf8');
  const legacyRedirect = await readFile(
    join(outputRoot, 'getting-started/index.html'),
    'utf8'
  );
  const nextRedirect = await readFile(
    join(outputRoot, 'next/getting-started/index.html'),
    'utf8'
  );
  if (
    !neutralHome.includes('/v2/') ||
    !neutralHome.includes('/v1/') ||
    !neutralHome.includes('/editor/')
  ) {
    throw new Error('GA root is not a neutral product/version entry point.');
  }
  if (!legacyRedirect.includes('/v1/getting-started/')) {
    throw new Error('Legacy unversioned docs do not redirect to v1 LTS.');
  }
  if (!nextRedirect.includes('/v2/getting-started/')) {
    throw new Error('The v2 preview namespace does not redirect to /v2.');
  }
  if (v1Home.includes('/next/')) {
    throw new Error('v1 LTS still links to the retired preview namespace.');
  }
}

for (const namespace of ['v1', v2Namespace]) {
  const namespaceRoot = join(outputRoot, namespace);
  for (const file of await collectHtml(namespaceRoot)) {
    const html = await readFile(file, 'utf8');
    const invalidRootLink = html.match(
      /(?:href|src|action)=["']\/(?!\/|v1\/|v2\/|next\/|editor\/|versions\/)/
    );
    if (invalidRootLink) {
      throw new Error(
        `${file.slice(outputRoot.length)} escapes its version namespace: ${invalidRootLink[0]}`
      );
    }
  }
}

process.stdout.write(
  `Verified ${alwaysRequiredFiles.length + stageRequiredFiles.length} versioned site artifacts and source contracts.\n`
);
