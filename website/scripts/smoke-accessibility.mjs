import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const websiteRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const exportRoot = path.join(websiteRoot, 'dist');
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json'],
  ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.wasm', 'application/wasm'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

const server = createServer(async (request, response) => {
  try {
    const requestPath = decodeURIComponent(
      new URL(request.url ?? '/', 'http://127.0.0.1').pathname
    ).replace(/^\/+/, '');
    let filePath = path.resolve(exportRoot, requestPath || 'index.html');
    if (
      filePath !== exportRoot &&
      !filePath.startsWith(`${exportRoot}${path.sep}`)
    ) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if ((await stat(filePath)).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    const body = await readFile(filePath);
    response.writeHead(200, {
      'content-type':
        contentTypes.get(path.extname(filePath)) ?? 'application/octet-stream',
    });
    response.end(body);
  } catch (error) {
    const status =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
        ? 404
        : 500;
    response
      .writeHead(status)
      .end(status === 404 ? 'Not found' : 'Server error');
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

const address = server.address();
assert(address && typeof address === 'object');
const origin = `http://127.0.0.1:${address.port}`;
const routes = [
  '/',
  '/getting-started/',
  '/tools/',
  '/playground/',
  '/recipe/',
  '/node/',
  '/cli/',
  '/zh-cn/',
  '/zh-cn/getting-started/',
  '/zh-cn/tools/',
  '/zh-cn/playground/',
  '/zh-cn/recipe/',
  '/zh-cn/node/',
  '/zh-cn/cli/',
];
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
];

let browser;
try {
  browser = process.env.CI
    ? await chromium.launch({ headless: true })
    : await chromium.launch({ channel: 'chrome', headless: true });
  const failures = [];

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);

    for (const route of routes) {
      await page.goto(`${origin}${route}`, { waitUntil: 'networkidle' });
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      for (const violation of results.violations) {
        failures.push({
          route,
          viewport: viewport.name,
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.map((node) => node.target.join(' ')),
        });
      }
    }
    await context.close();
  }

  assert.deepEqual(
    failures,
    [],
    `Accessibility violations:\n${JSON.stringify(failures, null, 2)}`
  );
  console.log(
    `Verified WCAG A/AA axe scans for ${routes.length} English/Chinese routes at mobile and desktop widths.`
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
