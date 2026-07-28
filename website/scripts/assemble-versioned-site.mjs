import {
  access,
  cp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requiredArgument(name) {
  const value = readArgument(name);
  if (!value) throw new Error(`Missing required argument: ${name}`);
  return resolve(value);
}

const v1Root = requiredArgument('--v1-dir');
const nextRoot = requiredArgument('--next-dir');
const archiveRoot = requiredArgument('--archive-root');
const outputRoot = requiredArgument('--out-dir');
const v1Sha = readArgument('--v1-sha') || 'local-v1';
const nextSha = readArgument('--next-sha') || 'local-next';
const archiveSha = readArgument('--archive-sha') || 'local-archive';
const siteOrigin = 'https://image-marker.corerobin.com';

for (const directory of [v1Root, nextRoot, archiveRoot]) {
  await access(directory);
}
await access(join(v1Root, 'index.html'));
await access(join(nextRoot, 'index.html'));

const archiveManifest = JSON.parse(
  await readFile(join(archiveRoot, 'package.json'), 'utf8')
);
if (archiveManifest.version !== '1.0.0') {
  throw new Error(
    `The archive source must be v1.0.0, received ${String(archiveManifest.version)}.`
  );
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

// Before v2 GA, existing unversioned routes remain the v1 documentation.
await cp(v1Root, outputRoot, { recursive: true });

async function collectFiles(directory) {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else files.push(path);
  }
  return files;
}

async function prefixStaticSite(source, destination, basePath) {
  await cp(source, destination, { recursive: true });
  const prefix = basePath.replace(/\/$/, '');
  const textExtensions = new Set(['.html', '.xml', '.json', '.txt']);
  const { extname } = await import('node:path');

  for (const file of await collectFiles(destination)) {
    if (!textExtensions.has(extname(file))) continue;
    let content = await readFile(file, 'utf8');
    content = content
      .replaceAll(`${siteOrigin}/`, `${siteOrigin}${prefix}/`)
      .replace(
        /(\b(?:href|src|action)=["'])\/(?!\/|v1\/|next\/|editor\/|versions\/)/g,
        `$1${prefix}/`
      );
    await writeFile(file, content, 'utf8');
  }
}

await prefixStaticSite(v1Root, join(outputRoot, 'v1'), '/v1/');
await prefixStaticSite(nextRoot, join(outputRoot, 'next'), '/next/');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const archivePage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${siteOrigin}/versions/1.0.0/">
    <title>React Native Image Marker v1.0.0 archive</title>
    <style>
      :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
      body { max-width: 52rem; margin: 0 auto; padding: 4rem 1.5rem; line-height: 1.65; }
      .badge { display: inline-block; padding: .3rem .65rem; border-radius: 999px; background: #3156d9; color: white; font-weight: 700; }
      code { padding: .15rem .35rem; border-radius: .3rem; background: color-mix(in srgb, currentColor 10%, transparent); }
      nav { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 2rem; }
    </style>
  </head>
  <body>
    <span class="badge">Immutable archive</span>
    <h1>React Native Image Marker v1.0.0</h1>
    <p>This page preserves the original v1.0.0 release. It does not receive fixes and its source is locked to commit <code>${escapeHtml(archiveSha)}</code>.</p>
    <p>For a compatible v1 release that continues to receive critical fixes, use <code>npm install react-native-image-marker@1</code> and read the v1 LTS documentation.</p>
    <nav>
      <a href="/v1/">v1 LTS documentation</a>
      <a href="https://github.com/JimmyDaddy/react-native-image-marker/tree/v1.0.0">v1.0.0 source</a>
      <a href="https://github.com/JimmyDaddy/react-native-image-marker/blob/v1.0.0/README.MD">Original README</a>
      <a href="/next/">v2 preview</a>
    </nav>
  </body>
</html>`;

const editorPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <link rel="canonical" href="${siteOrigin}/editor/">
    <title>Image Marker Editor 0.0.x</title>
    <style>
      :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
      body { max-width: 52rem; margin: 0 auto; padding: 4rem 1.5rem; line-height: 1.65; }
      .badge { display: inline-block; padding: .3rem .65rem; border-radius: 999px; background: #9c5a00; color: white; font-weight: 700; }
      code { padding: .15rem .35rem; border-radius: .3rem; background: color-mix(in srgb, currentColor 10%, transparent); }
    </style>
  </head>
  <body>
    <span class="badge">Experimental</span>
    <h1>React Native Image Marker Editor 0.0.x</h1>
    <p>The optional interaction editor is being developed as a separate package. Its first stable package release will be <code>react-native-image-marker-editor@0.0.1</code> and it will require <code>react-native-image-marker@^2.0.0</code>.</p>
    <p><a href="/next/">Read the v2 preview documentation</a></p>
  </body>
</html>`;

for (const [relativePath, html] of [
  ['versions/1.0.0/index.html', archivePage],
  ['editor/index.html', editorPage],
]) {
  const path = join(outputRoot, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, html, 'utf8');
}

const versions = JSON.parse(
  await readFile(new URL('../versions.json', import.meta.url), 'utf8')
);
await writeFile(
  join(outputRoot, 'versions.json'),
  `${JSON.stringify(versions, null, 2)}\n`,
  'utf8'
);
await writeFile(
  join(outputRoot, 'build-manifest.json'),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      sources: {
        v1: { ref: 'release/1.x', sha: v1Sha },
        v2: { ref: 'master', sha: nextSha },
        archive: { ref: 'v1.0.0', sha: archiveSha },
      },
    },
    null,
    2
  )}\n`,
  'utf8'
);

process.stdout.write(`Assembled versioned site at ${outputRoot}\n`);
