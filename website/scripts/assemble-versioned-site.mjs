import {
  access,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';

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

const versions = JSON.parse(
  await readFile(new URL('../versions.json', import.meta.url), 'utf8')
);
const isGa = versions.releaseStage === 'ga';
if (!['pre-ga', 'ga'].includes(versions.releaseStage)) {
  throw new Error(
    `Unsupported documentation release stage: ${String(versions.releaseStage)}.`
  );
}
if (versions.current !== (isGa ? 'v2' : 'v1')) {
  throw new Error(
    `${versions.releaseStage} documentation must declare ${isGa ? 'v2' : 'v1'} as current.`
  );
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

async function collectFiles(directory) {
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

  for (const file of await collectFiles(destination)) {
    if (!textExtensions.has(extname(file))) continue;
    let content = await readFile(file, 'utf8');
    content = content
      .replaceAll(`${siteOrigin}/`, `${siteOrigin}${prefix}/`)
      .replace(
        /(\b(?:href|src|action)=["'])\/(?!\/|v1\/|v2\/|next\/|editor\/|versions\/)/g,
        `$1${prefix}/`
      );
    if (isGa && prefix === '/v1') {
      content = content
        .replaceAll('/next/', '/v2/')
        .replaceAll('v2 Preview', 'v2 Current')
        .replaceAll('v2 preview', 'v2')
        .replaceAll('v2 预览', 'v2 当前版本');
    }
    await writeFile(file, content, 'utf8');
  }
}

// Before v2 GA, existing unversioned routes remain the v1 documentation. At
// GA, v2 assets seed the root while every HTML route becomes either the neutral
// entry point or a compatibility redirect.
await cp(isGa ? nextRoot : v1Root, outputRoot, { recursive: true });
await prefixStaticSite(v1Root, join(outputRoot, 'v1'), '/v1/');
await prefixStaticSite(
  nextRoot,
  join(outputRoot, isGa ? 'v2' : 'next'),
  isGa ? '/v2/' : '/next/'
);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function routeFromHtmlPath(relativePath) {
  const portablePath = relativePath.split(sep).join('/');
  if (portablePath === 'index.html') return '/';
  if (portablePath.endsWith('/index.html')) {
    return `/${portablePath.slice(0, -'index.html'.length)}`;
  }
  return `/${portablePath}`;
}

function redirectPage(target, title) {
  const safeTarget = escapeHtml(target);
  const encodedTarget = JSON.stringify(target);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <meta http-equiv="refresh" content="0; url=${safeTarget}">
    <link rel="canonical" href="${siteOrigin}${safeTarget}">
    <title>${escapeHtml(title)}</title>
    <script>window.location.replace(${encodedTarget} + window.location.search + window.location.hash);</script>
  </head>
  <body>
    <p>This documentation moved to <a href="${safeTarget}">${safeTarget}</a>.</p>
  </body>
</html>`;
}

async function writeRedirect(relativePath, target, title, root = outputRoot) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, redirectPage(target, title), 'utf8');
}

const v2DocsBase = isGa ? '/v2/' : '/next/';

if (isGa) {
  const v1Html = new Set(
    (await collectFiles(v1Root))
      .filter((file) => extname(file) === '.html')
      .map((file) => relative(v1Root, file))
  );
  const rootHtml = new Set([
    ...v1Html,
    ...(await collectFiles(nextRoot))
      .filter((file) => extname(file) === '.html')
      .map((file) => relative(nextRoot, file)),
  ]);

  for (const relativePath of rootHtml) {
    if (relativePath === 'index.html') continue;
    const route = routeFromHtmlPath(relativePath);
    const base = v1Html.has(relativePath) ? '/v1' : '/v2';
    await writeRedirect(
      relativePath,
      `${base}${route}`,
      `Documentation moved to ${base}${route}`
    );
  }

  for (const file of await collectFiles(nextRoot)) {
    if (extname(file) !== '.html') continue;
    const relativePath = relative(nextRoot, file);
    const route = routeFromHtmlPath(relativePath);
    await writeRedirect(
      relativePath,
      `/v2${route}`,
      `v2 preview moved to /v2${route}`,
      join(outputRoot, 'next')
    );
  }
}

const neutralPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${siteOrigin}/">
    <title>React Native Image Marker</title>
    <style>
      :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
      body { max-width: 62rem; margin: 0 auto; padding: 4rem 1.5rem; line-height: 1.65; }
      .eyebrow { color: #5271ff; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 1rem; margin: 2rem 0; }
      .card { display: block; padding: 1.25rem; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); border-radius: .9rem; color: inherit; text-decoration: none; }
      .card:hover { border-color: #5271ff; transform: translateY(-1px); }
      .card strong { display: block; font-size: 1.1rem; }
      .card span { color: color-mix(in srgb, currentColor 70%, transparent); }
    </style>
  </head>
  <body>
    <p class="eyebrow">React Native · iOS · Android · Web</p>
    <h1>React Native Image Marker</h1>
    <p>Add visible and invisible watermarks with a typed, cancellable pipeline. Choose the release line that matches your application.</p>
    <div class="grid">
      <a class="card" href="/v2/"><strong>Core v2</strong><span>Current release · structured results and Recipe v2</span></a>
      <a class="card" href="/v1/"><strong>Core v1 LTS</strong><span>Compatibility and critical bug fixes</span></a>
      <a class="card" href="/editor/"><strong>Editor 0.0.x</strong><span>Optional interactive recipe editor</span></a>
      <a class="card" href="/versions/1.0.0/"><strong>v1.0.0 archive</strong><span>Immutable historical documentation</span></a>
    </div>
    <p lang="zh-CN">请选择版本：<a href="/v2/zh-cn/">Core v2</a>、<a href="/v1/zh-cn/">Core v1 LTS</a>、<a href="/editor/zh-cn/">可选编辑器</a>。</p>
  </body>
</html>`;

if (isGa) {
  await writeFile(join(outputRoot, 'index.html'), neutralPage, 'utf8');
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
      <a href="${v2DocsBase}">v2 documentation</a>
    </nav>
  </body>
</html>`;

const editorPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="${isGa ? 'index,follow' : 'noindex'}">
    <link rel="canonical" href="${siteOrigin}/editor/">
    <title>Image Marker Editor 0.0.x</title>
    <style>
      :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
      body { max-width: 52rem; margin: 0 auto; padding: 4rem 1.5rem; line-height: 1.65; }
      .badge { display: inline-block; padding: .3rem .65rem; border-radius: 999px; background: #9c5a00; color: white; font-weight: 700; }
      code { padding: .15rem .35rem; border-radius: .3rem; background: color-mix(in srgb, currentColor 10%, transparent); }
      pre { overflow: auto; padding: 1rem; border-radius: .7rem; background: color-mix(in srgb, currentColor 8%, transparent); }
      nav { display: flex; flex-wrap: wrap; gap: 1rem; margin: 2rem 0; }
    </style>
  </head>
  <body>
    <span class="badge">Experimental</span>
    <h1>React Native Image Marker Editor 0.0.1</h1>
    <p>The optional interaction editor is a separate JS/TS package. It requires <code>react-native-image-marker@^2.0.0</code> and delegates previews and final encoding to Core.</p>
    <pre><code>npm install react-native-image-marker@^2 react-native-image-marker-editor@0.0.1</code></pre>
    <h2>Included in 0.0.1</h2>
    <ul>
      <li>Text and image layers with select, drag, scale, rotate, reorder, visibility, and locks.</li>
      <li>Alignment guides, snapping, safe areas, grouped undo/redo, keyboard controls, and baseline accessibility.</li>
      <li>Recipe v2 import/export, low-resolution previews, original export, invisible trace, and optional C2PA settings.</li>
      <li>An opt-in Core adapter; applications may inject a server or custom renderer instead.</li>
    </ul>
    <p>Video, general filters, cloud collaboration, and duplicate native encoding are intentionally outside this release.</p>
    <nav>
      <a href="${v2DocsBase}guides/editor/">Integration guide</a>
      <a href="${v2DocsBase}guides/performance-and-jobs/">Preview and export performance</a>
      <a href="/editor/zh-cn/">简体中文</a>
      <a href="${v2DocsBase}">Core 2 documentation</a>
    </nav>
  </body>
</html>`;

const editorZhPage = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="${isGa ? 'index,follow' : 'noindex'}">
    <link rel="canonical" href="${siteOrigin}/editor/zh-cn/">
    <title>Image Marker Editor 0.0.1</title>
    <style>
      :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
      body { max-width: 52rem; margin: 0 auto; padding: 4rem 1.5rem; line-height: 1.65; }
      .badge { display: inline-block; padding: .3rem .65rem; border-radius: 999px; background: #9c5a00; color: white; font-weight: 700; }
      code { padding: .15rem .35rem; border-radius: .3rem; background: color-mix(in srgb, currentColor 10%, transparent); }
      pre { overflow: auto; padding: 1rem; border-radius: .7rem; background: color-mix(in srgb, currentColor 8%, transparent); }
      nav { display: flex; flex-wrap: wrap; gap: 1rem; margin: 2rem 0; }
    </style>
  </head>
  <body>
    <span class="badge">实验性</span>
    <h1>React Native Image Marker Editor 0.0.1</h1>
    <p>可选交互编辑器是独立 JS/TS 包，依赖 <code>react-native-image-marker@^2.0.0</code>，预览与最终编码仍委托给 Core。</p>
    <pre><code>npm install react-native-image-marker@^2 react-native-image-marker-editor@0.0.1</code></pre>
    <h2>0.0.1 包含</h2>
    <ul>
      <li>文字和图片图层，以及选择、拖动、缩放、旋转、排序、显隐和锁定。</li>
      <li>对齐线、吸附、安全区域、分组 undo/redo、键盘操作和基础无障碍。</li>
      <li>Recipe v2 导入导出、低分辨率预览、原图导出、隐形追踪与可选 C2PA 设置。</li>
      <li>按需引入 Core adapter；应用也可注入服务端或自定义 renderer。</li>
    </ul>
    <p>视频、通用滤镜、云端协作和重复的原生编码不进入此版本。</p>
    <nav>
      <a href="${v2DocsBase}zh-cn/guides/editor/">接入指南</a>
      <a href="${v2DocsBase}zh-cn/guides/performance-and-jobs/">预览与导出性能</a>
      <a href="/editor/">English</a>
      <a href="${v2DocsBase}zh-cn/">Core 2 文档</a>
    </nav>
  </body>
</html>`;

for (const [relativePath, html] of [
  ['versions/1.0.0/index.html', archivePage],
  ['editor/index.html', editorPage],
  ['editor/zh-cn/index.html', editorZhPage],
]) {
  const path = join(outputRoot, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, html, 'utf8');
}

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
