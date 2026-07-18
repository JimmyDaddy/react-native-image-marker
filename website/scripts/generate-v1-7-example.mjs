import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const websiteRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const exportRoot = path.join(websiteRoot, 'dist');
const outputPath = path.join(
  websiteRoot,
  'public',
  'media',
  'watermark-tiled.jpg'
);
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.woff2', 'font/woff2'],
]);

const server = createServer(async (request, response) => {
  try {
    const requestPath = decodeURIComponent(
      new URL(request.url ?? '/', 'http://127.0.0.1').pathname
    ).replace(/^\/+/, '');
    let filePath = path.resolve(exportRoot, requestPath || 'index.html');
    if (!filePath.startsWith(`${exportRoot}${path.sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if ((await stat(filePath)).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    response.writeHead(200, {
      'content-type':
        contentTypes.get(path.extname(filePath)) ?? 'application/octet-stream',
    });
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

const address = server.address();
assert(address && typeof address === 'object');

let browser;
try {
  browser = await launchChromium();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`http://127.0.0.1:${address.port}/playground/`, {
    waitUntil: 'networkidle',
  });
  await page
    .locator('[data-render-state][data-state="rendered"]')
    .waitFor();

  await page.locator('[data-format]').evaluate((select) => {
    select.value = 'jpg';
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const preview = document.querySelector('[data-preview]');
    return (
      preview instanceof HTMLImageElement &&
      preview.src.startsWith('data:image/jpeg;base64,')
    );
  });

  const dataUrl = await page.locator('[data-preview]').getAttribute('src');
  assert(dataUrl?.startsWith('data:image/jpeg;base64,'));
  await writeFile(outputPath, Buffer.from(dataUrl.split(',', 2)[1], 'base64'));
  console.log(`Generated ${path.relative(websiteRoot, outputPath)}.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}

async function launchChromium() {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    if (process.env.CI) throw error;
    return chromium.launch({ channel: 'chrome', headless: true });
  }
}
