import { access, readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const outputRoot = resolve(readArgument('--dir') || 'versioned-dist');
const alwaysRequiredFiles = [
  'index.html',
  'v1/index.html',
  'v1/zh-cn/index.html',
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
const v1ZhHome = await readFile(
  join(outputRoot, 'v1/zh-cn/index.html'),
  'utf8'
);
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
const v2DocsBase = isGa ? '/' : '/next/';
const v2DocsRoot = isGa ? outputRoot : join(outputRoot, 'next');
const stageRequiredFiles = isGa
  ? [
      'getting-started/index.html',
      'api/index.html',
      'v2/index.html',
      'v2/getting-started/index.html',
      'v2/api/index.html',
      'next/index.html',
      'next/getting-started/index.html',
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
const v2Home = await readFile(join(v2DocsRoot, 'index.html'), 'utf8');

for (const fragment of [
  '/v1/getting-started/',
  '/v1/tools/',
  'edit/release/1.x/website/',
]) {
  if (!v1Home.includes(fragment)) {
    throw new Error(
      `v1 documentation is missing versioned fragment: ${fragment}`
    );
  }
}
for (const fragment of [
  `${v2DocsBase}getting-started/`,
  `${v2DocsBase}tools/`,
  'edit/master/website/',
]) {
  if (!v2Home.includes(fragment)) {
    throw new Error(
      `v2 documentation is missing versioned fragment: ${fragment}`
    );
  }
}
if (!archive.includes(buildManifest.sources.archive.sha)) {
  throw new Error(
    'v1.0.0 archive page does not expose its immutable source SHA.'
  );
}
if (
  !editor.includes('react-native-image-marker-editor@0.0.1') ||
  !editor.includes('react-native-image-marker@^2.0.0')
) {
  throw new Error('Editor page does not expose the initial version contract.');
}
if (
  !editor.includes(`${v2DocsBase}guides/editor/`) ||
  !editorZh.includes(`${v2DocsBase}zh-cn/guides/editor/`)
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
if (
  !versions.versions.some(
    (version) =>
      version.id === 'v2' &&
      version.source === 'master' &&
      version.status === 'current' &&
      version.basePath === (isGa ? '/' : '/next/')
  )
) {
  throw new Error('Version manifest does not expose v2 at its canonical path.');
}

if (isGa) {
  const v2Redirect = await readFile(
    join(outputRoot, 'v2/getting-started/index.html'),
    'utf8'
  );
  const nextRedirect = await readFile(
    join(outputRoot, 'next/getting-started/index.html'),
    'utf8'
  );
  if (
    !v2Home.includes('/getting-started/') ||
    !v2Home.includes('/tools/') ||
    !v2Home.includes('data-primary-nav')
  ) {
    throw new Error('GA root does not contain the canonical v2 documentation.');
  }
  if (!v2Redirect.includes('/getting-started/')) {
    throw new Error(
      'The legacy /v2 namespace does not redirect to the root docs.'
    );
  }
  if (!nextRedirect.includes('/getting-started/')) {
    throw new Error(
      'The v2 preview namespace does not redirect to the root docs.'
    );
  }
  if (v1Home.includes('/next/') || v1Home.includes('/v2/')) {
    throw new Error('v1 LTS still links to a non-canonical v2 namespace.');
  }
  for (const destination of [
    'value="/zh-cn/"',
    'value="/v1/zh-cn/"',
    'value="/editor/zh-cn/"',
  ]) {
    if (!v1ZhHome.includes(destination)) {
      throw new Error(
        `Chinese v1 documentation is missing localized version destination: ${destination}`
      );
    }
  }

  for (const file of await collectHtml(outputRoot)) {
    const relativePath = relative(outputRoot, file).split(sep).join('/');
    if (
      ['v1/', 'v2/', 'next/', 'editor/', 'versions/'].some((prefix) =>
        relativePath.startsWith(prefix)
      )
    ) {
      continue;
    }
    const html = await readFile(file, 'utf8');
    if (/(?:href|src|action)=["']\/v2\//.test(html)) {
      throw new Error(
        `Canonical v2 documentation still links through /v2: ${relativePath}`
      );
    }
  }
}

const invalidVersionNamespaceLink = isGa
  ? /(?:href|src|action)=["']\/(?!["']|\/|zh-cn\/|v1\/|v2\/|next\/|editor\/|versions\/)/
  : /(?:href|src|action)=["']\/(?!["']|\/|v1\/|v2\/|next\/|editor\/|versions\/)/;

for (const namespace of isGa ? ['v1'] : ['v1', 'next']) {
  const namespaceRoot = join(outputRoot, namespace);
  for (const file of await collectHtml(namespaceRoot)) {
    const html = await readFile(file, 'utf8');
    const invalidRootLink = html.match(invalidVersionNamespaceLink);
    if (invalidRootLink) {
      throw new Error(
        `${file.slice(outputRoot.length)} escapes its version namespace: ${
          invalidRootLink[0]
        }`
      );
    }
  }
}

process.stdout.write(
  `Verified ${
    alwaysRequiredFiles.length + stageRequiredFiles.length
  } versioned site artifacts and source contracts.\n`
);
