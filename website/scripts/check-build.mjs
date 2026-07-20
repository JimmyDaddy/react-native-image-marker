import { access, readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const outputRoot = new URL('../dist/', import.meta.url).pathname;
const requiredFiles = [
  'index.html',
  '404.html',
  'getting-started/index.html',
  'playground/index.html',
  'tools/index.html',
  'tools/watermark/index.html',
  'tools/batch-watermark/index.html',
  'tools/confidential-watermark/index.html',
  'tools/invisible-watermark/index.html',
  'tools/trace-checker/index.html',
  'tools/recipe-builder/index.html',
  'tools/recipient-trace-package/index.html',
  'tools/trace-lab/index.html',
  'tools/content-credentials/index.html',
  'compatibility/index.html',
  'guides/invisible-watermarks/index.html',
  'cookbook/index.html',
  'troubleshooting/index.html',
  'sitemap/index.html',
  'api/index.html',
  'zh-cn/index.html',
  'zh-cn/getting-started/index.html',
  'zh-cn/playground/index.html',
  'zh-cn/tools/index.html',
  'zh-cn/tools/watermark/index.html',
  'zh-cn/tools/batch-watermark/index.html',
  'zh-cn/tools/confidential-watermark/index.html',
  'zh-cn/tools/invisible-watermark/index.html',
  'zh-cn/tools/trace-checker/index.html',
  'zh-cn/tools/recipe-builder/index.html',
  'zh-cn/tools/recipient-trace-package/index.html',
  'zh-cn/tools/trace-lab/index.html',
  'zh-cn/tools/content-credentials/index.html',
  'zh-cn/compatibility/index.html',
  'zh-cn/guides/choose-an-api/index.html',
  'zh-cn/guides/position-and-style/index.html',
  'zh-cn/guides/output-and-quality/index.html',
  'zh-cn/guides/invisible-watermarks/index.html',
  'zh-cn/cookbook/index.html',
  'zh-cn/troubleshooting/index.html',
  'zh-cn/sitemap/index.html',
  'zh-cn/migration/index.html',
  'zh-cn/api/index.html',
  'zh-cn/api/classes/marker/index.html',
  'classes/Marker.html',
  'interfaces/TextMarkOptions.html',
  'usage-guide.html',
  'v1.0.x/index.html',
  'react-native-image-marker/classes/Marker.html',
  'react-native-image-marker/index.html',
  'CNAME',
  'favicon.svg',
  'social-preview.png',
  'social-preview.svg',
  'media/watermark-after-dark.jpg',
  'media/watermark-tiled.jpg',
  'media/marker-compass.png',
  'worker/invisible-watermark.js',
  'robots.txt',
  'sitemap-index.xml',
  'sitemap-0.xml',
];

for (const relativePath of requiredFiles) {
  await access(join(outputRoot, relativePath));
}

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectHtml(path)));
    } else if (extname(entry.name) === '.html') {
      files.push(path);
    }
  }

  return files;
}

const staleDeploymentReference =
  /jimmydaddy\.github\.io\/react-native-image-marker|(?:href|src)=["']\/react-native-image-marker\//g;
const offenders = [];
const brokenLinks = [];

function outputPathForUrl(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const relativePath = decoded.replace(/^\//, '');

  if (relativePath === '') {
    return join(outputRoot, 'index.html');
  }

  if (relativePath.endsWith('/')) {
    return join(outputRoot, relativePath, 'index.html');
  }

  return join(outputRoot, relativePath);
}

for (const file of await collectHtml(outputRoot)) {
  const html = await readFile(file, 'utf8');
  if (staleDeploymentReference.test(html)) {
    offenders.push(file.slice(outputRoot.length));
  }
  staleDeploymentReference.lastIndex = 0;

  for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
    const reference = match[1];
    if (!reference.startsWith('/') || reference.startsWith('//')) {
      continue;
    }

    const urlPath = reference.split(/[?#]/, 1)[0];
    try {
      await access(outputPathForUrl(urlPath));
    } catch {
      brokenLinks.push(`${file.slice(outputRoot.length)} -> ${reference}`);
    }
  }
}

if (offenders.length > 0) {
  throw new Error(
    `Found stale references to the previous GitHub Pages URL:\n${offenders.join(
      '\n'
    )}`
  );
}

if (brokenLinks.length > 0) {
  throw new Error(`Found broken internal links:\n${brokenLinks.join('\n')}`);
}

const cname = (await readFile(join(outputRoot, 'CNAME'), 'utf8')).trim();
if (cname !== 'image-marker.corerobin.com') {
  throw new Error(`Unexpected CNAME value: ${cname}`);
}

const chineseHome = await readFile(
  join(outputRoot, 'zh-cn/index.html'),
  'utf8'
);

for (const fragment of [
  'alt="React Native Image Marker logo"',
  'https://image-marker.corerobin.com/social-preview.png',
  'content="1200"',
  'content="630"',
]) {
  if (!chineseHome.includes(fragment)) {
    throw new Error(
      `Homepage is missing expected branding metadata: ${fragment}`
    );
  }
}

const requiredChineseHomeFragments = [
  '<html lang="zh-CN"',
  'hreflang="en"',
  'hreflang="zh-CN"',
  'href="/zh-cn/"',
  '这张图加了什么',
  '直接给图片加水印',
  '/zh-cn/tools/watermark/',
  '/zh-cn/tools/',
];

for (const fragment of requiredChineseHomeFragments) {
  if (!chineseHome.includes(fragment)) {
    throw new Error(
      `Chinese homepage is missing expected content: ${fragment}`
    );
  }
}

const chineseApi = await readFile(
  join(outputRoot, 'zh-cn/api/classes/marker/index.html'),
  'utf8'
);
for (const label of ['API 参考', '枚举', '类', '接口', '类型别名']) {
  if (!chineseApi.includes(label)) {
    throw new Error(`Chinese API sidebar is missing expected label: ${label}`);
  }
}

const englishPlayground = await readFile(
  join(outputRoot, 'playground/index.html'),
  'utf8'
);
for (const fragment of [
  'Add a watermark to an image.',
  'Live preview',
  'Save image',
  'Update preview automatically',
]) {
  if (!englishPlayground.includes(fragment)) {
    throw new Error(
      `English playground is missing expected content: ${fragment}`
    );
  }
}

const chinesePlayground = await readFile(
  join(outputRoot, 'zh-cn/playground/index.html'),
  'utf8'
);
for (const fragment of [
  '<html lang="zh-CN"',
  '试着给图片加上水印。',
  '实时预览',
  '保存图片',
  '自动更新预览',
]) {
  if (!chinesePlayground.includes(fragment)) {
    throw new Error(
      `Chinese playground is missing expected content: ${fragment}`
    );
  }
}

const robots = await readFile(join(outputRoot, 'robots.txt'), 'utf8');
if (
  !robots.includes(
    'Sitemap: https://image-marker.corerobin.com/sitemap-index.xml'
  )
) {
  throw new Error('robots.txt does not point to the production sitemap index.');
}

const xmlSitemap = await readFile(join(outputRoot, 'sitemap-0.xml'), 'utf8');
for (const url of [
  'https://image-marker.corerobin.com/sitemap/',
  'https://image-marker.corerobin.com/zh-cn/sitemap/',
  'https://image-marker.corerobin.com/tools/',
  'https://image-marker.corerobin.com/tools/watermark/',
  'https://image-marker.corerobin.com/tools/batch-watermark/',
  'https://image-marker.corerobin.com/tools/confidential-watermark/',
  'https://image-marker.corerobin.com/tools/invisible-watermark/',
  'https://image-marker.corerobin.com/tools/trace-checker/',
  'https://image-marker.corerobin.com/tools/recipe-builder/',
  'https://image-marker.corerobin.com/tools/recipient-trace-package/',
  'https://image-marker.corerobin.com/tools/trace-lab/',
  'https://image-marker.corerobin.com/tools/content-credentials/',
  'https://image-marker.corerobin.com/zh-cn/tools/',
  'https://image-marker.corerobin.com/zh-cn/tools/watermark/',
  'https://image-marker.corerobin.com/zh-cn/tools/batch-watermark/',
  'https://image-marker.corerobin.com/zh-cn/tools/confidential-watermark/',
  'https://image-marker.corerobin.com/zh-cn/tools/invisible-watermark/',
  'https://image-marker.corerobin.com/zh-cn/tools/trace-checker/',
  'https://image-marker.corerobin.com/zh-cn/tools/recipe-builder/',
  'https://image-marker.corerobin.com/zh-cn/tools/recipient-trace-package/',
  'https://image-marker.corerobin.com/zh-cn/tools/trace-lab/',
  'https://image-marker.corerobin.com/zh-cn/tools/content-credentials/',
]) {
  if (!xmlSitemap.includes(`<loc>${url}</loc>`)) {
    throw new Error(`XML sitemap is missing expected URL: ${url}`);
  }
}

console.log(
  `Verified ${requiredFiles.length} required pages, internal links, and the custom domain.`
);
