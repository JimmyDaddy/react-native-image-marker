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

  const code = await playground.locator('[data-web-code]').textContent();
  assert.match(
    code ?? '',
    /export async function createMarkedImage\(\): Promise<string>/
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
  await page.getByRole('link', { name: '快速开始', exact: true }).waitFor();
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

  console.log(
    'Verified navigation, responsive layout, watermark controls, invisible trace embed/detect, preview-to-code parity, batch Blob results, cancellation, both playground routes, downloads, and the HTML sitemap.'
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
}

async function assertBatchRecipe(page, playground) {
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

  assert.equal(await playground.locator('[data-example]').count(), 8);
  assert.equal(await playground.locator('.capability-index li').count(), 11);
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
    layout.controls.y < 280,
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
  const menu = page.locator('[data-language-menu]').first();
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
  const menu = page.locator('[data-theme-menu]').first();
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

async function assertCustomSelects(playground) {
  const customSelects = playground.locator('[data-custom-select]');
  assert.equal(
    await customSelects.count(),
    7,
    'Playground should render seven custom selectors.'
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
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    if (process.env.CI) {
      throw error;
    }
    return chromium.launch({ channel: 'chrome', headless: true });
  }
}
