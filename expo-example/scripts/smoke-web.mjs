import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

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

const crossOriginFixture = path.join(exampleRoot, 'assets', 'icon.jpeg');
const crossOriginServer = createServer(async (_request, response) => {
  try {
    response.writeHead(200, { 'content-type': 'image/jpeg' });
    response.end(await readFile(crossOriginFixture));
  } catch {
    response.writeHead(500).end('Server error');
  }
});

await Promise.all([listen(server), listen(crossOriginServer)]);

const address = server.address();
const crossOriginAddress = crossOriginServer.address();
assert(address && typeof address === 'object');
assert(crossOriginAddress && typeof crossOriginAddress === 'object');

try {
  for (const [browserName, browserType] of [
    ['Chromium', chromium],
    ['Firefox', firefox],
    ['WebKit', webkit],
  ]) {
    await verifyBrowser(browserName, browserType);
  }
} finally {
  await Promise.all([close(server), close(crossOriginServer)]);
}

function listen(target) {
  return new Promise((resolve, reject) => {
    target.once('error', reject);
    target.listen(0, '127.0.0.1', resolve);
  });
}

function close(target) {
  return new Promise((resolve, reject) => {
    target.close((error) => (error ? reject(error) : resolve()));
  });
}

async function verifyBrowser(browserName, browserType) {
  const browser = await launchBrowser(browserName, browserType);
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.setDefaultTimeout(20_000);

    await page.goto(`http://127.0.0.1:${address.port}?smoke=1`, {
      waitUntil: 'networkidle',
    });
    await page.getByText('Make the watermark. Keep the moment.').waitFor();
    await page.waitForFunction(() => Boolean(window.__IMAGE_MARKER_SMOKE__));
    const baselineSource = await page
      .getByRole('img', {
        name: 'Example mountain landscape before watermarking',
      })
      .getAttribute('src');
    assert(baselineSource, 'Expected the unmarked background source.');

    const renderButton = page.getByRole('button', {
      name: 'Render with Marker.mark()',
    });
    await renderButton.click();
    await page
      .getByText('Rendered JPG data URL entirely in this browser.')
      .waitFor();

    const jpegSource = await assertDataUrl(page, 'image/jpeg');
    await assertVisibleComposition(page, baselineSource, jpegSource);

    await page.getByRole('button', { name: 'PNG', exact: true }).click();
    await renderButton.click();
    await page
      .getByText('Rendered PNG data URL entirely in this browser.')
      .waitFor();
    const pngSource = await assertDataUrl(page, 'image/png');
    await assertVisibleComposition(page, baselineSource, pngSource);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download', exact: true }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'image-marker-web-demo.png');

    const harnessResults = await page.evaluate(async (crossOriginUrl) => {
      const harness = window.__IMAGE_MARKER_SMOKE__;
      if (!harness) throw new Error('Web smoke harness was not installed.');
      const [blobAndFile, largeCropped] = await Promise.all([
        harness.renderBlobAndFile(),
        harness.renderLargeCropped(),
      ]);
      const corsMessage = await harness.renderCrossOrigin(crossOriginUrl);
      return { blobAndFile, largeCropped, corsMessage };
    }, `http://127.0.0.1:${crossOriginAddress.port}/fixture.jpeg`);

    assert.match(
      harnessResults.blobAndFile.dataUrl,
      /^data:image\/png;base64,/
    );
    assert(harnessResults.blobAndFile.width > 0);
    assert(harnessResults.blobAndFile.height > 0);
    assert.deepEqual(
      {
        width: harnessResults.largeCropped.width,
        height: harnessResults.largeCropped.height,
      },
      { width: 1024, height: 768 }
    );
    assert.match(
      harnessResults.largeCropped.dataUrl,
      /^data:image\/png;base64,/
    );
    assert.match(harnessResults.corsMessage, /Access-Control-Allow-Origin/i);
    assert.deepEqual(
      pageErrors,
      [],
      `Browser runtime errors: ${pageErrors.join('\n')}`
    );

    console.log(
      `Verified ${browserName}: Canvas pixels, JPG/PNG, Blob/File, CORS, rotation crop, alpha, and 4096px max-size rendering.`
    );
  } finally {
    await browser.close();
  }
}

async function assertDataUrl(page, mimeType) {
  const locator = page.locator(`img[src^="data:${mimeType};base64,"]`);
  await locator.waitFor();
  const source = await locator.getAttribute('src');
  assert(
    source?.startsWith(`data:${mimeType};base64,`),
    `Expected a ${mimeType} data URL.`
  );
  const dimensions = await locator.evaluate(async (image) => {
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  });
  assert(dimensions.width > 0 && dimensions.height > 0);
  assert(
    (source?.length ?? 0) > 1_000,
    'Encoded image output is unexpectedly small.'
  );
  return source;
}

async function assertVisibleComposition(page, baselineSource, renderedSource) {
  const comparison = await page.evaluate(
    async ({ baselineSource, renderedSource }) => {
      const load = (source) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = source;
        });
      const [baseline, rendered] = await Promise.all([
        load(baselineSource),
        load(renderedSource),
      ]);
      const width = 160;
      const height = 90;
      const pixels = (image) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context)
          throw new Error('Canvas 2D unavailable during smoke test.');
        context.drawImage(image, 0, 0, width, height);
        return context.getImageData(0, 0, width, height).data;
      };
      const before = pixels(baseline);
      const after = pixels(rendered);
      let changed = 0;
      let totalDelta = 0;
      for (let index = 0; index < before.length; index += 4) {
        const delta =
          Math.abs(before[index] - after[index]) +
          Math.abs(before[index + 1] - after[index + 1]) +
          Math.abs(before[index + 2] - after[index + 2]);
        totalDelta += delta;
        if (delta >= 24) changed += 1;
      }
      return {
        changedRatio: changed / (width * height),
        meanChannelDelta: totalDelta / (width * height * 3),
      };
    },
    { baselineSource, renderedSource }
  );

  assert(
    comparison.changedRatio > 0.003,
    `Expected visible watermark pixels, changed ratio was ${comparison.changedRatio}.`
  );
  assert(
    comparison.meanChannelDelta > 0.25,
    `Expected a meaningful rendered difference, mean delta was ${comparison.meanChannelDelta}.`
  );
}

async function launchBrowser(browserName, browserType) {
  try {
    return await browserType.launch({ headless: true });
  } catch (error) {
    if (process.env.CI || browserName !== 'Chromium') {
      throw error;
    }
    return chromium.launch({ channel: 'chrome', headless: true });
  }
}
