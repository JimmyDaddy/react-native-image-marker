import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

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
  ['.ico', 'image/x-icon'],
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

let browser;
try {
  browser = await launchChromium();
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.setDefaultTimeout(25_000);
  const origin = `http://127.0.0.1:${address.port}`;

  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
  const primaryNav = page.locator('[data-primary-nav]');
  await primaryNav.waitFor();
  await primaryNav.getByRole('link', { name: 'Playground' }).waitFor();
  await assertWideHomepageLayout(page, origin);

  await page.goto(`${origin}/guides/editor/`, { waitUntil: 'networkidle' });
  const editorGuideLink = page.getByRole('link', {
    name: 'live Playground',
    exact: true,
  });
  assert.equal(
    await editorGuideLink.getAttribute('href'),
    '/playground/?workflow=editor#editor-playground'
  );
  await editorGuideLink.click();
  await page
    .locator('[data-workspace-tab="editor"][aria-selected="true"]')
    .waitFor();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${origin}/playground/`, { waitUntil: 'networkidle' });
  const playground = page.locator('[data-marker-playground]');
  await playground.waitFor();
  await waitForRendered(playground);
  await assertPreviewMime(playground, 'image/png');
  await assertVisibleLogo(playground);
  await assertCustomSelects(playground);
  await assertLayoutControlsAndCode(page, playground);
  await assertInvisibleTrace(page, playground);
  await assertBatchRecipe(page, playground);
  await selectWorkspaceTab(playground, 'editor');
  await assertEditorPlayground(page);
  await selectWorkspaceTab(playground, 'visible');

  const code = await playground.locator('[data-web-code]').textContent();
  assert.match(
    code ?? '',
    /export async function createMarkedImage\(\): Promise<MarkerResult>/
  );
  assert.doesNotMatch(
    code ?? '',
    /fileToDataUrl|backgroundFile|logoFile|setMarkedImageUri/
  );

  await playground.locator('[data-live-preview]').uncheck();
  await selectCustomOptionWithKeyboard(playground, 'format', 'jpg');
  await playground.getByText('Changes ready. Update the preview.').waitFor();
  await playground.locator('[data-render]').click();
  await waitForRendered(playground);
  await assertPreviewMime(playground, 'image/jpeg');

  const downloadPromise = page.waitForEvent('download');
  await playground.locator('[data-download]').click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'image-marker-web-demo.jpg');

  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto(`${origin}/zh-cn/playground/`, { waitUntil: 'networkidle' });
  const chinesePlayground = page.locator('[data-marker-playground]');
  await waitForRendered(chinesePlayground);
  await page
    .locator('[data-editor-playground][data-initialized="true"]')
    .waitFor({ state: 'attached' });
  await page.getByText('试着给图片加上水印。').waitFor();
  await assertWorkbenchLayout(page);
  await assertLanguageMenu(page);
  await assertThemeMenu(page);
  await assertWideWorkbenchLayout(page, origin);

  await page.goto(`${origin}/zh-cn/sitemap/`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: '网站地图', exact: true }).waitFor();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/zh-cn/playground/`, { waitUntil: 'networkidle' });
  await page.getByText('菜单', { exact: true }).click();
  await page.getByRole('link', { name: '使用指南', exact: true }).waitFor();
  await assertMobileUtilities(page);
  const mobileWidth = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  assert.equal(
    mobileWidth.page,
    mobileWidth.viewport,
    'Mobile playground should not overflow.'
  );
  assert.deepEqual(
    pageErrors,
    [],
    `Browser runtime errors: ${pageErrors.join('\n')}`
  );

  await browser.close();
  browser = undefined;
  const additionalBrowsers = process.env.CI
    ? [
        ['Firefox', firefox],
        ['WebKit', webkit],
      ]
    : [];
  for (const [browserName, browserType] of additionalBrowsers) {
    browser = await browserType.launch({ headless: true });
    const workerPage = await browser.newPage();
    const workerErrors = [];
    workerPage.on('pageerror', (error) => workerErrors.push(error.message));
    workerPage.setDefaultTimeout(25_000);
    await workerPage.goto(`${origin}/playground/`, {
      waitUntil: 'networkidle',
    });
    const workerPlayground = workerPage.locator('[data-marker-playground]');
    await waitForRendered(workerPlayground);
    assert.equal(
      await workerPlayground.locator('[data-invisible-executor]').inputValue(),
      'worker'
    );
    await assertInvisibleTrace(workerPage, workerPlayground);
    assert.deepEqual(
      workerErrors,
      [],
      `${browserName} Worker runtime errors: ${workerErrors.join('\n')}`
    );
    await browser.close();
    browser = undefined;
  }

  console.log(
    'Verified navigation, responsive layout, watermark controls, interactive Editor controller and Core render, Worker detection (plus Firefox and WebKit in CI), preview-to-code parity, batch Blob results, cancellation, both playground routes, downloads, and the HTML sitemap.'
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}

async function waitForRendered(playground) {
  await playground
    .locator('[data-render-state][data-state="rendered"]')
    .waitFor();
}

async function assertPreviewMime(playground, mimeType) {
  const source = await playground.locator('[data-preview]').getAttribute('src');
  assert(
    source?.startsWith(`data:${mimeType};base64,`),
    `Expected a ${mimeType} preview.`
  );
}

async function assertVisibleLogo(playground) {
  const orangePixels = await playground
    .locator('[data-preview]')
    .evaluate(async (image) => {
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) return 0;
      context.drawImage(image, 0, 0);
      const size = Math.min(240, canvas.width, canvas.height);
      const pixels = context.getImageData(
        canvas.width - size,
        0,
        size,
        size
      ).data;
      let count = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (
          pixels[index] > 220 &&
          pixels[index + 1] < 130 &&
          pixels[index + 2] < 100
        ) {
          count += 1;
        }
      }
      return count;
    });

  assert(
    orangePixels > 100,
    'Default image watermark should be visible over the background.'
  );
}

async function assertInvisibleTrace(page, playground) {
  await selectWorkspaceTab(playground, 'invisible');
  assert.equal(
    await playground.locator('[data-code-title]').textContent(),
    'Invisible trace code'
  );
  let webCode = await playground.locator('[data-web-code]').textContent();
  let nativeCode = await playground.locator('[data-native-code]').textContent();
  assert.match(webCode ?? '', /Marker\.embedInvisible/);
  assert.match(webCode ?? '', /Marker\.detectInvisible/);
  assert.match(webCode ?? '', /payload: "asset-42"/);
  assert.match(webCode ?? '', /strength: 'robust'/);
  assert.match(webCode ?? '', /worker: \{/);
  assert.match(webCode ?? '', /invisible-watermark\.js/);
  assert.match(nativeCode ?? '', /image: \{ src: \{ uri: marked\.uri \} \}/);
  assert.doesNotMatch(nativeCode ?? '', /worker: \{/);
  await playground.locator('[data-invisible-embed]').click();
  await page.waitForFunction(() =>
    document
      .querySelector('[data-invisible-status]')
      ?.textContent?.includes('Embedded')
  );
  await assertPreviewMime(playground, 'image/png');
  assert.equal(
    await playground.locator('[data-invisible-detect]').isEnabled(),
    true
  );
  await playground.locator('[data-invisible-detect]').click();
  await page.waitForFunction(() =>
    document
      .querySelector('[data-invisible-status]')
      ?.textContent?.includes('Verified: asset-42')
  );
  await playground
    .getByText('Compose signed Content Credentials', { exact: true })
    .click();
  assert.match(
    (await playground.locator('.invisible-code').last().textContent()) ?? '',
    /embedInvisibleWithCredentials/
  );

  await playground.locator('[data-invisible-payload]').fill('asset-84');
  webCode = await playground.locator('[data-web-code]').textContent();
  nativeCode = await playground.locator('[data-native-code]').textContent();
  assert.match(webCode ?? '', /payload: "asset-84"/);
  assert.match(nativeCode ?? '', /payload: "asset-84"/);
}

async function assertBatchRecipe(page, playground) {
  await selectWorkspaceTab(playground, 'batch');
  assert.equal(
    await playground.locator('[data-code-title]').textContent(),
    'Batch processing code'
  );
  const webCode = await playground.locator('[data-web-code]').textContent();
  const nativeCode = await playground
    .locator('[data-native-code]')
    .textContent();
  assert.match(webCode ?? '', /Marker\.createRecipe/);
  assert.match(webCode ?? '', /schemaVersion: 2/);
  assert.match(webCode ?? '', /layers:/);
  assert.match(webCode ?? '', /output: \{/);
  assert.doesNotMatch(webCode ?? '', /schemaVersion: 1/);
  assert.match(webCode ?? '', /resultType: 'blob'/);
  assert.match(webCode ?? '', /recipe\.applyMany/);
  assert.match(webCode ?? '', /\{\{sourceName\}\}/);
  assert.match(webCode ?? '', /concurrency: 4/);
  assert.match(nativeCode ?? '', /Marker\.createRecipe/);
  assert.match(nativeCode ?? '', /recipe\.applyMany/);
  assert.match(nativeCode ?? '', /concurrency: 1/);
  assert.doesNotMatch(nativeCode ?? '', /resultType: 'blob'/);
  const batchFiles = playground.locator('[data-batch-files]');
  const fixtureNames = [
    'playground-background.jpg',
    'watermark-coast.jpg',
    'watermark-after-dark.jpg',
  ];
  const fixturePaths = fixtureNames.map((name) =>
    path.join(websiteRoot, 'public', 'media', name)
  );
  await batchFiles.setInputFiles(fixturePaths);
  await playground.getByText('3 images queued').waitFor();
  await playground.locator('[data-batch-run]').click();
  await page.waitForFunction(() =>
    document
      .querySelector('[data-batch-status]')
      ?.textContent?.includes('Batch complete')
  );

  const results = playground.locator('[data-batch-result]');
  assert.equal(await results.count(), 3);
  assert.deepEqual(
    await results.locator('strong').allTextContents(),
    fixtureNames
  );
  assert.equal(
    await playground.locator('[data-batch-result="fulfilled"]').count(),
    3
  );
  const sources = await results
    .locator('img')
    .evaluateAll((images) => images.map((image) => image.getAttribute('src')));
  assert(sources.every((source) => source?.startsWith('blob:')));

  const cancelFixtures = [
    ...fixturePaths,
    path.join(websiteRoot, 'public', 'media', 'watermark-tiled.jpg'),
    path.join(websiteRoot, 'public', 'media', 'watermark-waypoint.jpg'),
  ];
  await batchFiles.setInputFiles(cancelFixtures);
  await playground.locator('[data-batch-run]').click();
  await playground.locator('[data-batch-cancel]').click();
  await page.waitForFunction(() =>
    document
      .querySelector('[data-batch-status]')
      ?.textContent?.includes('Batch complete')
  );
  assert.equal(await results.count(), 5);
  assert(
    (await playground.locator('[data-batch-result="aborted"]').count()) > 0,
    'Cancelling should leave at least one not-yet-dispatched image aborted.'
  );
}

async function assertEditorPlayground(page) {
  const editor = page.locator(
    '[data-editor-playground][data-initialized="true"]'
  );
  await editor.waitFor();
  assert.equal(
    await editor.locator('[data-editor-layer]').count(),
    2,
    'Editor playground should start with text and image layers.'
  );
  assert.match(
    (await editor.locator('[data-editor-recipe]').textContent()) ?? '',
    /"schemaVersion": 2/
  );

  const title = editor.locator('[data-editor-layer="web-title"]');
  await title.scrollIntoViewIfNeeded();
  const before = JSON.parse(
    (await editor.locator('[data-editor-recipe]').textContent()) ?? '{}'
  );
  const beforeTitle = before.layers.find((layer) => layer.id === 'web-title');
  const bounds = await title.boundingBox();
  assert(bounds, 'Editor title layer should be visible.');
  const canvasBounds = await editor
    .locator('[data-editor-canvas]')
    .boundingBox();
  assert(canvasBounds, 'Editor canvas should be visible.');
  const dragStart = {
    x: Math.max(bounds.x, canvasBounds.x) + 20,
    y: Math.max(bounds.y, canvasBounds.y) + 20,
  };
  const hitTarget = await page.evaluate(({ x, y }) => {
    const hit = document.elementFromPoint(x, y);
    return {
      tag: hit?.tagName,
      layer: hit
        ?.closest('[data-editor-layer]')
        ?.getAttribute('data-editor-layer'),
      classes: hit?.getAttribute('class'),
      action: hit?.getAttribute('data-editor-action'),
      text: hit?.textContent,
    };
  }, dragStart);
  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragStart.x + 42, dragStart.y + 24, { steps: 4 });
  await page.mouse.up();
  const after = JSON.parse(
    (await editor.locator('[data-editor-recipe]').textContent()) ?? '{}'
  );
  const afterTitle = after.layers.find((layer) => layer.id === 'web-title');
  assert(
    afterTitle.position.X > beforeTitle.position.X,
    `Dragging should update the Editor controller recipe: ${JSON.stringify({
      bounds,
      canvasBounds,
      hitTarget,
      before: beforeTitle.position,
      after: afterTitle.position,
    })}`
  );

  await editor.locator('[data-editor-action="add-text"]').click();
  assert.equal(await editor.locator('[data-editor-layer]').count(), 3);
  await editor.locator('[data-editor-action="undo"]').click();
  assert.equal(await editor.locator('[data-editor-layer]').count(), 2);

  await editor.locator('[data-editor-layer="web-logo"]').click();
  await editor.locator('[data-editor-action="lock"]').click();
  assert.equal(await editor.locator('[data-editor-scale]').isDisabled(), true);
  await editor.locator('[data-editor-action="lock"]').click();
  assert.equal(await editor.locator('[data-editor-scale]').isEnabled(), true);

  const editorLogo = await editor
    .locator('[data-editor-layer="web-logo"]')
    .evaluate((node) => {
      const canvas = node.closest('[data-editor-canvas]');
      const image = node.querySelector('img');
      if (!(canvas instanceof HTMLElement) || !(image instanceof HTMLElement)) {
        throw new Error('Editor logo geometry is unavailable.');
      }
      const canvasBounds = canvas.getBoundingClientRect();
      const imageBounds = image.getBoundingClientRect();
      return {
        x: (imageBounds.left - canvasBounds.left) / canvasBounds.width,
        y: (imageBounds.top - canvasBounds.top) / canvasBounds.height,
        width: imageBounds.width / canvasBounds.width,
        height: imageBounds.height / canvasBounds.height,
      };
    });

  const readRenderedLogo = () =>
    editor
      .locator('[data-editor-result-image]')
      .evaluate(async (image, editorLogo) => {
        if (!(image instanceof HTMLImageElement)) {
          throw new Error('Core result image is unavailable.');
        }
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Unable to inspect the Core result.');
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        ).data;
        const left = Math.max(
          0,
          Math.floor((editorLogo.x - 0.03) * canvas.width)
        );
        const right = Math.min(
          canvas.width,
          Math.ceil((editorLogo.x + editorLogo.width + 0.03) * canvas.width)
        );
        const top = Math.max(
          0,
          Math.floor((editorLogo.y - 0.03) * canvas.height)
        );
        const bottom = Math.min(
          canvas.height,
          Math.ceil((editorLogo.y + editorLogo.height + 0.03) * canvas.height)
        );
        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = -1;
        let maxY = -1;
        for (let y = top; y < bottom; y += 1) {
          for (let x = left; x < right; x += 1) {
            const offset = (y * canvas.width + x) * 4;
            const red = pixels[offset];
            const green = pixels[offset + 1];
            const blue = pixels[offset + 2];
            const alpha = pixels[offset + 3];
            if (
              red > 245 &&
              green > 50 &&
              green < 125 &&
              blue > 20 &&
              blue < 105 &&
              red - green > 125 &&
              alpha > 220
            ) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }
        if (maxX < minX || maxY < minY) {
          throw new Error('Unable to find the rendered orange logo pixels.');
        }
        return {
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          x: minX / canvas.width,
          y: minY / canvas.height,
          width: (maxX - minX + 1) / canvas.width,
          height: (maxY - minY + 1) / canvas.height,
        };
      }, editorLogo);

  const assertLogoParity = (rendered, kind) => {
    const editorCenter = {
      x: editorLogo.x + editorLogo.width / 2,
      y: editorLogo.y + editorLogo.height / 2,
    };
    const renderedCenter = {
      x: rendered.x + rendered.width / 2,
      y: rendered.y + rendered.height / 2,
    };
    const widthRatio = rendered.width / editorLogo.width;
    const heightRatio = rendered.height / editorLogo.height;
    assert(
      Math.abs(renderedCenter.x - editorCenter.x) < 0.012 &&
        Math.abs(renderedCenter.y - editorCenter.y) < 0.012 &&
        widthRatio > 0.75 &&
        widthRatio < 0.9 &&
        Math.abs(widthRatio - heightRatio) < 0.03,
      `${kind} logo geometry should match the Editor canvas: ${JSON.stringify({
        editor: editorLogo,
        rendered,
      })}`
    );
  };

  await editor.locator('[data-editor-action="preview"]').click();
  await editor
    .locator('[data-editor-result]:not([hidden]) [data-editor-result-image]')
    .waitFor();
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-editor-playground]');
    return root?.getAttribute('data-editor-render-state') === 'rendered';
  });
  const output = await editor
    .locator('[data-editor-result-image]')
    .getAttribute('src');
  assert(
    output?.startsWith('data:image/png;base64,'),
    'Editor preview should render a real PNG through Core.'
  );
  const previewLogo = await readRenderedLogo();
  assert.deepEqual(
    [previewLogo.naturalWidth, previewLogo.naturalHeight],
    [960, 600],
    'Editor preview should use the bounded Core dimensions.'
  );
  assertLogoParity(previewLogo, 'Preview');

  await editor.locator('[data-editor-action="export"]').click();
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-editor-playground]');
    const image = root?.querySelector('[data-editor-result-image]');
    return (
      root?.getAttribute('data-editor-render-state') === 'rendered' &&
      root?.getAttribute('data-editor-render-kind') === 'export' &&
      image instanceof HTMLImageElement &&
      image.naturalWidth === 1586
    );
  });
  const exportedLogo = await readRenderedLogo();
  assert.deepEqual(
    [exportedLogo.naturalWidth, exportedLogo.naturalHeight],
    [1586, 992],
    'Editor export should preserve the original dimensions.'
  );
  assertLogoParity(exportedLogo, 'Export');
}

async function assertLayoutControlsAndCode(page, playground) {
  const textTile = playground.locator(
    '[data-layout-layer="text"][data-layout="tile"]'
  );
  const textSingle = playground.locator(
    '[data-layout-layer="text"][data-layout="single"]'
  );
  const imageTile = playground.locator(
    '[data-layout-layer="image"][data-layout="tile"]'
  );
  const imageSingle = playground.locator(
    '[data-layout-layer="image"][data-layout="single"]'
  );
  const preview = playground.locator('[data-preview]');

  const workspaceTabs = playground.locator('[data-workspace-tab]');
  assert.equal(await workspaceTabs.count(), 4);
  assert.equal(
    await playground
      .locator('[data-workspace-tab="visible"]')
      .getAttribute('aria-selected'),
    'true'
  );
  assert(
    await playground.locator('[data-workspace-panel="visible"]').isVisible(),
    'Visible watermark controls should be the initial workspace.'
  );
  assert.equal(await playground.locator('[data-example]').count(), 6);
  assert.equal(await playground.locator('.capability-index li').count(), 12);
  assert(
    await textSingle.isVisible(),
    'Text layout switch should be visible without opening advanced controls.'
  );
  assert(
    await imageSingle.isVisible(),
    'Logo layout switch should be visible without opening advanced controls.'
  );
  assert.equal(await textSingle.getAttribute('aria-pressed'), 'true');
  assert.equal(await imageSingle.getAttribute('aria-pressed'), 'true');

  let code = await playground.locator('[data-web-code]').textContent();
  assert.match(code ?? '', /alpha: 0\.85/);
  assert.match(
    code ?? '',
    /position: \{ position: Position\.bottomLeft, X: 48, Y: 48 \}/
  );
  assert.doesNotMatch(code ?? '', /layout:/);
  assert.match(code ?? '', /strokeStyle: \{ color: '#101828', width: 2 \}/);

  let previousSource = await preview.getAttribute('src');
  await playground.locator('[data-example="outline"]').click();
  await waitForPreviewChange(page, playground, previousSource);
  code = await playground.locator('[data-web-code]').textContent();
  assert.match(code ?? '', /Marker\.markText/);
  assert.match(code ?? '', /text: ["']IMAGE MARKER["']/);
  assert.match(code ?? '', /alpha: 1/);
  assert.match(code ?? '', /strokeStyle: \{ color: '#101828', width: 4 \}/);

  previousSource = await preview.getAttribute('src');
  await playground.locator('[data-example="opacity"]').click();
  await waitForPreviewChange(page, playground, previousSource);
  code = await playground.locator('[data-web-code]').textContent();
  assert.match(code ?? '', /text: ["']PRIVATE PREVIEW["']/);
  assert.match(code ?? '', /alpha: 0\.4/);

  previousSource = await preview.getAttribute('src');
  await playground.locator('[data-example="blend"]').click();
  await waitForPreviewChange(page, playground, previousSource);
  code = await playground.locator('[data-web-code]').textContent();
  assert.match(code ?? '', /blendMode: 'screen'/);
  assert.match(code ?? '', /blendMode: 'multiply'/);

  previousSource = await preview.getAttribute('src');
  await playground.locator('[data-example="mixed"]').click();
  await waitForPreviewChange(page, playground, previousSource);

  previousSource = await preview.getAttribute('src');
  await playground.locator('[data-text-opacity]').fill('0.45');
  await playground.locator('[data-stroke-width]').fill('4');
  await waitForPreviewChange(page, playground, previousSource);

  code = await playground.locator('[data-web-code]').textContent();
  assert.match(code ?? '', /alpha: 0\.45/);
  assert.match(code ?? '', /strokeStyle: \{ color: '#101828', width: 4 \}/);

  await playground
    .locator('[data-text-controls] details.advanced-controls summary')
    .click();
  await playground
    .locator('[data-image-controls] details.advanced-controls summary')
    .click();
  previousSource = await preview.getAttribute('src');
  await textTile.click();
  await waitForPreviewChange(page, playground, previousSource);
  previousSource = await preview.getAttribute('src');
  await playground.locator('[data-text-gap-x]').fill('12%');
  await playground.locator('[data-text-stagger]').uncheck();
  await waitForPreviewChange(page, playground, previousSource);
  code = await playground.locator('[data-web-code]').textContent();
  assert.match(code ?? '', /layout: \{\s*type: 'tile'/);
  assert.match(code ?? '', /gapX: ["']12%["']/);
  assert.match(code ?? '', /stagger: false/);

  previousSource = await preview.getAttribute('src');
  await imageTile.click();
  await waitForPreviewChange(page, playground, previousSource);
  code = await playground.locator('[data-web-code]').textContent();
  assert.equal((code ?? '').match(/layout:/g)?.length, 2);

  previousSource = await preview.getAttribute('src');
  await imageSingle.click();
  await waitForPreviewChange(page, playground, previousSource);
  previousSource = await preview.getAttribute('src');
  await textSingle.click();
  await waitForPreviewChange(page, playground, previousSource);
}

async function selectWorkspaceTab(playground, workspace) {
  const tab = playground.locator(`[data-workspace-tab="${workspace}"]`);
  const panel = playground.locator(`[data-workspace-panel="${workspace}"]`);
  await tab.click();
  assert.equal(await tab.getAttribute('aria-selected'), 'true');
  assert.equal(await panel.getAttribute('hidden'), null);
  if (workspace !== 'editor') {
    assert.equal(
      await playground
        .locator('.code-panel')
        .getAttribute('data-code-workspace'),
      workspace
    );
  }
  assert(
    await panel.isVisible(),
    `${workspace} workspace panel should be visible.`
  );
}

async function waitForPreviewChange(page, playground, previousSource) {
  await page.waitForFunction((previous) => {
    const preview = document.querySelector(
      '[data-marker-playground] [data-preview]'
    );
    return preview instanceof HTMLImageElement && preview.src !== previous;
  }, previousSource);
  await waitForRendered(playground);
}

async function assertWorkbenchLayout(page) {
  const layout = await page.evaluate(() => {
    const bounds = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      };
    };
    const tab = document.querySelector('.segmented-control button');
    const tabStyle = tab ? getComputedStyle(tab) : null;

    return {
      heroCount: document.querySelectorAll('.hero').length,
      h1Count: document.querySelectorAll('main h1').length,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      marker: bounds('.marker-playground'),
      controls: bounds('.controls-panel'),
      preview: bounds('.preview-panel'),
      textGrid: bounds('[data-text-controls] .field-grid-3'),
      tabDisplay: tabStyle?.display,
      tabAlign: tabStyle?.alignItems,
      tabJustify: tabStyle?.justifyContent,
    };
  });

  assert.equal(
    layout.heroCount,
    0,
    'Playground should not render a separate hero.'
  );
  assert.equal(
    layout.h1Count,
    1,
    'Playground should have one visible page title.'
  );
  assert.equal(
    layout.pageWidth,
    layout.viewportWidth,
    'Playground should not overflow horizontally.'
  );
  assert(layout.marker && layout.controls && layout.preview && layout.textGrid);
  assert(
    layout.marker.x >= 20 && layout.marker.x <= 28,
    'Workbench should keep a small page margin.'
  );
  assert(
    layout.marker.width >= 940,
    'Workbench should use the available desktop width.'
  );
  assert(
    layout.controls.y < layout.viewportHeight / 2,
    'Controls should be visible in the first viewport.'
  );
  assert(
    Math.abs(layout.controls.y - layout.preview.y) < 1,
    'Controls and preview should align.'
  );
  assert(
    layout.controls.scrollWidth <= layout.controls.clientWidth,
    'Controls should not overflow.'
  );
  assert(
    layout.textGrid.scrollWidth <= layout.textGrid.clientWidth,
    'Text controls should fit their panel.'
  );
  assert.equal(layout.tabDisplay, 'flex');
  assert.equal(layout.tabAlign, 'center');
  assert.equal(layout.tabJustify, 'center');
}

async function assertWideHomepageLayout(page, origin) {
  await page.setViewportSize({ width: 2048, height: 1100 });
  await page.goto(`${origin}/zh-cn/`, { waitUntil: 'networkidle' });
  const layout = await page.evaluate(() => {
    const container = document.querySelector(
      ':root[data-has-hero] main > .content-panel > .sl-container'
    );
    const stage = document.querySelector('.product-stage');
    if (!(container instanceof HTMLElement) || !(stage instanceof HTMLElement))
      return null;
    const containerRect = container.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    return {
      containerLeft: containerRect.left,
      containerRight: window.innerWidth - containerRect.right,
      containerWidth: containerRect.width,
      stageLeft: stageRect.left,
      stageRight: window.innerWidth - stageRect.right,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  assert(layout, 'Wide homepage layout should render.');
  assert.equal(
    layout.pageWidth,
    layout.viewportWidth,
    'Wide homepage should not overflow.'
  );
  assert(
    Math.abs(layout.containerLeft - layout.containerRight) < 1,
    'Homepage should be centered.'
  );
  assert.equal(
    Math.round(layout.containerWidth),
    1440,
    'Homepage should use its own maximum width.'
  );
  assert(
    Math.abs(layout.stageLeft - layout.stageRight) < 1,
    'Homepage feature stage should stay centered.'
  );
}

async function assertWideWorkbenchLayout(page, origin) {
  await page.setViewportSize({ width: 2048, height: 1100 });
  await page.goto(`${origin}/zh-cn/playground/`, { waitUntil: 'networkidle' });
  const layout = await page.evaluate(() => {
    const marker = document.querySelector('.marker-playground');
    const controls = document.querySelector('.controls-panel');
    const preview = document.querySelector('.preview-panel');
    if (
      !(marker instanceof HTMLElement) ||
      !(controls instanceof HTMLElement) ||
      !(preview instanceof HTMLElement)
    ) {
      return null;
    }
    const markerRect = marker.getBoundingClientRect();
    const controlsRect = controls.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();
    return {
      markerLeft: markerRect.left,
      markerRight: window.innerWidth - markerRect.right,
      markerWidth: markerRect.width,
      controlsLeft: controlsRect.left,
      previewLeft: previewRect.left,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  assert(layout, 'Wide playground layout should render.');
  assert.equal(
    layout.pageWidth,
    layout.viewportWidth,
    'Wide playground should not overflow.'
  );
  assert(
    Math.abs(layout.markerLeft - layout.markerRight) < 1,
    'Workbench should be centered in the viewport.'
  );
  assert(
    layout.markerLeft >= 200,
    'Wide screens should keep balanced side margins.'
  );
  assert.equal(
    Math.round(layout.markerWidth),
    1600,
    'Workbench should respect its maximum width.'
  );
  assert(
    layout.controlsLeft >= layout.markerLeft,
    'Controls must stay inside the workbench.'
  );
  assert(
    layout.previewLeft > layout.controlsLeft,
    'Preview must remain to the right of controls.'
  );
}

async function assertLanguageMenu(page) {
  const menu = page.locator('[data-language-menu]:visible').first();
  await menu.locator('summary').click();
  const popover = menu.locator('.preference-popover');
  await popover.waitFor();
  assert.equal(
    await menu.locator('select').count(),
    0,
    'Language menu should not use a native select.'
  );
  assert.equal(
    await popover
      .getByRole('menuitem', { name: /English/ })
      .getAttribute('href'),
    '/playground/'
  );
  const borderRadius = await popover.evaluate(
    (element) => getComputedStyle(element).borderRadius
  );
  assert.notEqual(borderRadius, '0px');
  await menu.press('Escape');
}

async function assertThemeMenu(page) {
  const menu = page.locator('[data-theme-menu]:visible').first();
  await menu.locator('summary').click();
  const popover = menu.locator('.preference-popover');
  await popover.waitFor();
  assert.equal(
    await menu.locator('select').count(),
    0,
    'Theme menu should not use a native select.'
  );

  await popover.getByRole('menuitemradio', { name: /深色/ }).click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert.equal(
    await page.evaluate(() => localStorage.getItem('starlight-theme')),
    'dark'
  );

  await menu.locator('summary').click();
  await popover.getByRole('menuitemradio', { name: /自动/ }).click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem('starlight-theme')),
    ''
  );
}

async function assertMobileUtilities(page) {
  const menu = page.locator('.mobile-nav-menu');
  const version = menu.getByRole('combobox', { name: '文档版本' });
  await version.waitFor();
  assert.deepEqual(
    await version
      .locator('option')
      .evaluateAll((options) => options.map((option) => option.value)),
    ['/zh-cn/', '/v1/zh-cn/', '/versions/1.0.0/', '/editor/zh-cn/']
  );
  await menu.getByRole('link', { name: /GitHub/ }).waitFor();

  const themeSummary = menu.locator('[data-theme-menu] summary');
  assert.equal(await themeSummary.getAttribute('aria-label'), '切换主题');
  await themeSummary.focus();
  await themeSummary.press('Enter');
  await menu.getByRole('menuitemradio', { name: /深色/ }).waitFor();
  await themeSummary.press('Escape');

  const languageSummary = menu.locator('[data-language-menu] summary');
  assert.equal(await languageSummary.getAttribute('aria-label'), '切换语言');
  await languageSummary.focus();
  await languageSummary.press('Enter');
  await menu.getByRole('menuitem', { name: /English/ }).waitFor();
  await languageSummary.press('Escape');
}

async function assertCustomSelects(playground) {
  const customSelects = playground.locator('[data-custom-select]');
  assert.equal(
    await customSelects.count(),
    8,
    'Playground should render eight custom selectors.'
  );
  for (const select of await playground.locator('select').all()) {
    assert.equal(
      await select.isVisible(),
      false,
      'Native select should only be a hidden form value.'
    );
  }
}

async function selectCustomOptionWithKeyboard(playground, name, expectedValue) {
  const customSelect = playground.locator(
    `[data-custom-select][data-select-name="${name}"]`
  );
  const trigger = customSelect.locator('[data-select-trigger]');
  await trigger.focus();
  await trigger.press('Enter');
  await customSelect
    .locator('[role="option"][aria-selected="true"]')
    .press('End');
  await customSelect.locator('[role="option"]:focus').press('Enter');
  assert.equal(
    await customSelect.locator('select').inputValue(),
    expectedValue
  );
  assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
}

async function launchChromium() {
  return process.env.CI
    ? chromium.launch({ headless: true })
    : chromium.launch({ channel: 'chrome', headless: true });
}
