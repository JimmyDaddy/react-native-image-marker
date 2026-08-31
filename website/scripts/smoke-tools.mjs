import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const websiteRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const exportRoot = path.join(websiteRoot, 'dist');
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
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
    if ((await stat(filePath)).isDirectory())
      filePath = path.join(filePath, 'index.html');
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
let browser;

try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.IMAGE_MARKER_BROWSER_CHANNEL
      ? { channel: process.env.IMAGE_MARKER_BROWSER_CHANNEL }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 980 },
  });
  page.setDefaultTimeout(60_000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(`${origin}/tools/`, { waitUntil: 'networkidle' });
  await page
    .getByRole('heading', { name: 'Free image watermark tools', exact: true })
    .waitFor();
  await page
    .locator('.tool-hub')
    .getByRole('link', { name: /Watermark an image/ })
    .waitFor();
  await page.getByRole('heading', { name: 'Create and batch' }).waitFor();
  const developerGroup = page
    .locator('.tool-hub-group')
    .filter({
      has: page.getByRole('heading', { name: 'Developer workflows' }),
    });
  await developerGroup.getByRole('link', { name: /Recipe builder/ }).waitFor();
  const editorLink = page
    .locator('.tool-hub-group')
    .filter({ has: page.getByRole('heading', { name: 'Developer workflows' }) })
    .getByRole('link', { name: /Interactive layer editor/ });
  await editorLink.waitFor();
  assert.equal(
    await editorLink.getAttribute('href'),
    '/playground/?workflow=editor#editor-playground'
  );
  await page
    .locator('[data-primary-nav]')
    .getByRole('link', { name: 'Tools', exact: true })
    .waitFor();

  await editorLink.click();
  await page
    .locator('[data-workspace-tab="editor"][aria-selected="true"]')
    .waitFor();
  await page
    .locator('[data-editor-playground][data-initialized="true"]')
    .waitFor();

  await page.goto(`${origin}/tools/watermark/`, { waitUntil: 'networkidle' });
  const watermark = page.locator('[data-online-tool]');
  const toolBackLink = watermark.locator('[data-tool-back]');
  assert.equal(await toolBackLink.getAttribute('href'), '/tools/');
  assert.equal(
    (await toolBackLink.innerText()).replace(/\s+/g, ' ').trim(),
    '← Back to all tools'
  );
  const desktopLayout = await page.evaluate(() => {
    const workbench = document.querySelector('.tool-workbench');
    if (!workbench) throw new Error('Tool workbench is missing.');
    const rect = workbench.getBoundingClientRect();
    return {
      left: rect.left,
      right: window.innerWidth - rect.right,
      mainPaneWidth:
        document.querySelector('.main-pane')?.getBoundingClientRect().width ??
        0,
      viewportWidth: window.innerWidth,
    };
  });
  assert.ok(
    Math.abs(desktopLayout.left - desktopLayout.right) <= 2,
    `Tool workbench should be centered: ${JSON.stringify(desktopLayout)}`
  );
  assert.equal(
    desktopLayout.mainPaneWidth,
    desktopLayout.viewportWidth,
    'Tool page should use the full main pane width.'
  );
  await watermark.locator('[data-status][data-state="success"]').waitFor();
  const visibleSource = await watermark
    .locator('[data-preview]')
    .getAttribute('src');
  assert.match(visibleSource ?? '', /^data:image\/png;base64,/);
  assert.equal(
    await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .some((entry) => entry.name.endsWith('.wasm'))
    ),
    false,
    'C2PA Wasm must not load on the visible watermark page.'
  );
  await watermark.locator('[data-layout]').selectOption('tile');
  await watermark
    .locator('[data-position-field][hidden]')
    .waitFor({ state: 'attached' });
  await watermark.locator('[data-status][data-state="success"]').waitFor();
  assert.equal(
    await watermark.locator('[data-position-field]').isHidden(),
    true
  );

  const fixture = await readFile(
    path.join(websiteRoot, 'public/media/playground-background.jpg')
  );
  const firstFile = {
    name: 'mountain-one.jpg',
    mimeType: 'image/jpeg',
    buffer: fixture,
  };
  const secondFile = {
    name: 'mountain-two.jpg',
    mimeType: 'image/jpeg',
    buffer: fixture,
  };
  await page.goto(`${origin}/tools/batch-watermark/`, {
    waitUntil: 'networkidle',
  });
  const batch = page.locator('[data-online-tool]');
  await batch
    .locator('[data-source-file]')
    .setInputFiles([firstFile, secondFile]);
  await batch.locator('[data-run]').click();
  await batch
    .locator('[data-status][data-state="success"]')
    .waitFor({ timeout: 90_000 });
  assert.equal(await batch.locator('[data-download-zip]').isEnabled(), true);
  const batchDownload = page.waitForEvent('download');
  await batch.locator('[data-download-zip]').click();
  assert.equal(
    (await batchDownload).suggestedFilename(),
    'image-marker-batch.zip'
  );

  await page.goto(`${origin}/tools/invisible-watermark/`, {
    waitUntil: 'networkidle',
  });
  const embed = page.locator('[data-online-tool]');
  await embed.locator('[data-run]').click();
  await embed
    .locator('[data-status][data-state="success"]')
    .waitFor({ timeout: 90_000 });
  const tracedSource = await embed
    .locator('[data-preview]')
    .getAttribute('src');
  assert.match(tracedSource ?? '', /^data:image\/png;base64,/);
  const tracedBuffer = Buffer.from(tracedSource.split(',', 2)[1], 'base64');

  await page.goto(`${origin}/tools/trace-checker/`, {
    waitUntil: 'networkidle',
  });
  const checker = page.locator('[data-online-tool]');
  await checker.locator('[data-source-file]').setInputFiles({
    name: 'traced.png',
    mimeType: 'image/png',
    buffer: tracedBuffer,
  });
  await checker.locator('[data-run]').click();
  await checker
    .locator('[data-status][data-state="success"]')
    .waitFor({ timeout: 90_000 });
  await checker.getByText('asset-42', { exact: true }).waitFor();

  await page.goto(`${origin}/tools/recipe-builder/`, {
    waitUntil: 'networkidle',
  });
  const recipe = page.locator('[data-online-tool]');
  await recipe.locator('[data-run]').click();
  await recipe.locator('[data-status][data-state="success"]').waitFor();
  assert.match(
    (await recipe.locator('[data-preview]').getAttribute('src')) ?? '',
    /^blob:/
  );

  await page.goto(`${origin}/tools/recipient-trace-package/`, {
    waitUntil: 'networkidle',
  });
  const recipients = page.locator('[data-online-tool]');
  await recipients.locator('[data-recipients]').fill('reviewer-a');
  const recipientDownload = page.waitForEvent('download');
  await recipients.locator('[data-run]').click();
  assert.equal(
    (await recipientDownload).suggestedFilename(),
    'image-marker-recipient-traces.zip'
  );
  await recipients
    .locator('[data-status][data-state="success"]')
    .waitFor({ timeout: 90_000 });
  await recipients.locator('[data-json]').getByText('reviewer-a').waitFor();

  await page.goto(`${origin}/tools/trace-lab/`, { waitUntil: 'networkidle' });
  const lab = page.locator('[data-online-tool]');
  await lab.locator('[data-run]').click();
  await lab.locator('[data-status][data-state="busy"]').waitFor();
  await lab
    .locator('[data-status]:not([data-state="busy"])')
    .waitFor({ timeout: 180_000 });
  assert.equal(await lab.locator('[data-result-rows] tr').count(), 6);
  assert.match(
    await lab.locator('[data-result-rows] tr').first().innerText(),
    /✓/
  );

  await page.goto(`${origin}/tools/content-credentials/`, {
    waitUntil: 'networkidle',
  });
  const credentials = page.locator('[data-online-tool]');
  await credentials.locator('[data-source-file]').setInputFiles(firstFile);
  await credentials.locator('[data-run]').click();
  await credentials
    .locator('[data-status]:not([data-state="busy"])')
    .waitFor({ timeout: 90_000 });
  await credentials.locator('[data-json]').waitFor();
  assert.equal(
    await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .some((entry) => entry.name.endsWith('.wasm'))
    ),
    true,
    'The C2PA reader should load its Wasm only after inspection starts.'
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/zh-cn/tools/watermark/`, {
    waitUntil: 'networkidle',
  });
  await page
    .locator('[data-online-tool] [data-status][data-state="success"]')
    .waitFor();
  assert.equal(
    await page.locator('[data-tool-back]').getAttribute('href'),
    '/zh-cn/tools/'
  );
  assert.equal(
    (await page.locator('[data-tool-back]').innerText())
      .replace(/\s+/g, ' ')
      .trim(),
    '← 返回全部工具'
  );
  const dimensions = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  assert.equal(
    dimensions.page,
    dimensions.viewport,
    'Mobile tool page should not overflow.'
  );

  assert.deepEqual(
    pageErrors,
    [],
    `Tool runtime errors:\n${pageErrors.join('\n')}`
  );
  console.log(
    'Verified tool hub, visible and tiled rendering, batch ZIP, invisible embed/detect, Recipe preview, recipient trace ZIP, robustness matrix, lazy C2PA inspection, and mobile layout.'
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
