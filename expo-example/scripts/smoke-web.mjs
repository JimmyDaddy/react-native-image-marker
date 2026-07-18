import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const exampleRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const exportRoot = path.join(exampleRoot, 'dist', 'web');
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
]);

const server = createServer(async (request, response) => {
  try {
    const requestPath = decodeURIComponent(
      new URL(request.url ?? '/', 'http://127.0.0.1').pathname
    ).replace(/^\/+/, '');
    const relativePath = requestPath || 'index.html';
    const filePath = path.resolve(exportRoot, relativePath);
    if (
      filePath !== exportRoot &&
      !filePath.startsWith(`${exportRoot}${path.sep}`)
    ) {
      response.writeHead(403).end('Forbidden');
      return;
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

let browser;
try {
  browser = await launchChromium();
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.setDefaultTimeout(20_000);

  await page.goto(`http://127.0.0.1:${address.port}`, {
    waitUntil: 'networkidle',
  });
  await page.getByText('Make the watermark. Keep the moment.').waitFor();

  const renderButton = page.getByRole('button', {
    name: 'Render with Marker.mark()',
  });
  await renderButton.click();
  await page
    .getByText('Rendered JPG data URL entirely in this browser.')
    .waitFor();

  await assertDataUrl(page, 'image/jpeg');

  await page.getByRole('button', { name: 'PNG', exact: true }).click();
  await renderButton.click();
  await page
    .getByText('Rendered PNG data URL entirely in this browser.')
    .waitFor();
  await assertDataUrl(page, 'image/png');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'image-marker-web-demo.png');
  assert.deepEqual(
    pageErrors,
    [],
    `Browser runtime errors: ${pageErrors.join('\n')}`
  );

  console.log(
    'Verified Expo Web runtime, Canvas output, and PNG download metadata.'
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}

async function assertDataUrl(page, mimeType) {
  const locator = page.locator(`img[src^="data:${mimeType};base64,"]`);
  await locator.waitFor();
  const source = await locator.getAttribute('src');
  assert(
    source?.startsWith(`data:${mimeType};base64,`),
    `Expected a ${mimeType} data URL.`
  );
}

async function launchChromium() {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    if (process.env.CI) {
      throw error;
    }
    return chromium.launch({ channel: 'chrome', headless: true });
  }
}
