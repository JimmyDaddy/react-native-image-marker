import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = path.join(root, 'scripts/fixtures/web-consumer');
const consumer = await mkdtemp(
  path.join(tmpdir(), 'image-marker-web-consumer-')
);
const argument = (name) => process.argv[process.argv.indexOf(name) + 1];
const registryVersion = process.argv.includes('--registry-version')
  ? argument('--registry-version')
  : undefined;
const output = path.resolve(
  process.env.IMAGE_MARKER_WEB_ARTIFACTS || path.join(root, 'artifacts/web-sdk')
);
const keep = process.argv.includes('--keep');
let server;
let browser;
const forbidden =
  /^(?:react|react-dom|react-native|react-native-image-marker|react-native-image-marker-editor|sharp|@types\/react(?:-native)?)$/;

function run(command, args, cwd = consumer, capture = false) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
  });
}
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(path.join(directory, entry.name))
          : path.join(directory, entry.name)
      )
    )
  ).flat();
}
async function pack(directory) {
  const result = JSON.parse(
    run(
      'npm',
      [
        'pack',
        '--ignore-scripts',
        '--json',
        '--pack-destination',
        consumer,
        directory,
      ],
      root,
      true
    )
  )[0];
  await cp(
    path.join(consumer, result.filename),
    path.join(output, result.filename)
  );
  return { ...result, tarball: path.join(consumer, result.filename) };
}
try {
  await mkdir(output, { recursive: true });
  await cp(fixture, consumer, { recursive: true });
  await mkdir(path.join(consumer, 'public'), { recursive: true });
  await cp(
    path.join(root, 'example/assets/fonts/RubikBurned-Regular.ttf'),
    path.join(consumer, 'public/fixture.ttf')
  );
  await writeFile(
    path.join(consumer, 'package.json'),
    JSON.stringify(
      {
        name: 'image-marker-web-external-consumer',
        private: true,
        type: 'module',
        devDependencies: { typescript: '5.9.3', vite: '8.1.5' },
      },
      null,
      2
    )
  );
  let packages = [];
  let dependencies;
  if (registryVersion) {
    dependencies = [`@image-marker/web@${registryVersion}`];
  } else {
    packages = [await pack('./packages/recipe'), await pack('./packages/web')];
    dependencies = packages.map((item) => item.tarball);
  }
  // Normal installation, including lifecycle scripts; no peer bypass or links.
  run('npm', ['install', '--no-audit', '--no-fund', ...dependencies]);
  run('npm', ['ls', '--all']);
  run('npm', ['audit', '--omit=dev', '--audit-level=moderate']);
  const lock = JSON.parse(
    await readFile(path.join(consumer, 'package-lock.json'), 'utf8')
  );
  for (const [location, item] of Object.entries(lock.packages)) {
    assert(!item.link, `Workspace link in clean consumer: ${location}`);
    const name = location.split('node_modules/').at(-1);
    assert(!forbidden.test(name), `Forbidden installed dependency: ${name}`);
  }
  const sdkRoot = path.join(consumer, 'node_modules/@image-marker/web');
  assert(
    !(await lstat(sdkRoot)).isSymbolicLink(),
    'SDK is a tarball install, not a workspace link'
  );
  const manifest = JSON.parse(
    await readFile(path.join(sdkRoot, 'package.json'), 'utf8')
  );
  assert.deepEqual(manifest.dependencies, { '@image-marker/recipe': '^0.1.0' });
  assert.equal(Object.keys(manifest.peerDependencies || {}).length, 0);
  for (const filename of await files(path.join(sdkRoot, 'lib'))) {
    if (!/\.(?:js|ts)$/.test(filename)) continue;
    const source = await readFile(filename, 'utf8');
    assert(
      !/(?:from\s*|import\s*\(|require\s*\()\s*['"](?:react(?:-native(?:-image-marker(?:-editor)?)?)?|sharp|node:[^'"]*)['"]/.test(
        source
      ),
      `Forbidden runtime/declaration dependency in ${filename}`
    );
    assert(
      !/reference\s+types=["'](?:react|node)/.test(source),
      `Ambient dependency in ${filename}`
    );
  }
  await writeFile(
    path.join(consumer, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          strict: true,
          skipLibCheck: false,
          noEmit: true,
          types: [],
        },
        include: ['*.ts'],
      },
      null,
      2
    )
  );
  run(path.join(consumer, 'node_modules/.bin/tsc'), ['-p', 'tsconfig.json']);
  run('node', [
    '--input-type=commonjs',
    '-e',
    `
    const assert = require('node:assert/strict');
    const sdk = require('@image-marker/web');
    const headless = require('@image-marker/web/headless');
    const adapter = require('@image-marker/web/editor-adapter');
    assert.equal(sdk.ImageFormat.png, 'png');
    assert.equal(typeof sdk.default.markText, 'function');
    assert.equal(typeof headless.ImageMarkerEditorController, 'function');
    assert.equal(typeof adapter.createWebEditorAdapter, 'function');
    assert.ok(require.resolve('@image-marker/web/worker').endsWith('invisible-watermark.js'));
  `,
  ]);
  run('node', [
    '--input-type=module',
    '-e',
    `
    import Marker from '@image-marker/web';
    import { ImageMarkerEditorController } from '@image-marker/web/headless';
    import { createWebEditorAdapter } from '@image-marker/web/editor-adapter';
    if (!Marker.markText || !ImageMarkerEditorController || !createWebEditorAdapter) throw Error('ESM exports failed');
  `,
  ]);
  run(path.join(consumer, 'node_modules/.bin/vite'), ['build']);
  const dist = path.join(consumer, 'dist');
  const distFiles = await files(dist);
  const workerFile = distFiles.find((file) =>
    /invisible-watermark-.*\.js$/.test(file)
  );
  assert(workerFile, 'Vite emitted the exported Worker as a production asset');
  const moduleGraph = JSON.parse(
    await readFile(path.join(dist, 'module-graph.json'), 'utf8')
  );
  assert(
    !moduleGraph.some((id) =>
      /node_modules\/(?:react(?:-dom|-native(?:-image-marker(?:-editor)?)?)?|sharp)\//.test(
        id
      )
    ),
    'Production module graph has no React/RN/legacy/native dependencies'
  );
  for (const file of distFiles.filter((name) => name.endsWith('.js'))) {
    assert(
      !/(?:from|import\(|require\()["'](?:react-native-image-marker(?:-editor)?|react-native|sharp)["']/.test(
        await readFile(file, 'utf8')
      ),
      'Production bundle has no legacy package imports'
    );
  }
  server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url, 'http://localhost').pathname
      );
      const filename = path.resolve(
        dist,
        `.${pathname === '/' ? '/index.html' : pathname}`
      );
      assert(filename.startsWith(`${dist}${path.sep}`));
      const body = await readFile(filename);
      response.setHeader(
        'Content-Type',
        filename.endsWith('.js')
          ? 'text/javascript'
          : filename.endsWith('.html')
          ? 'text/html'
          : filename.endsWith('.ttf')
          ? 'font/ttf'
          : 'application/octet-stream'
      );
      response.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; worker-src 'self'; img-src 'self' blob: data:; font-src 'self'; connect-src 'none'"
      );
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { chromium } = await import(
    pathToFileURL(
      path.join(
        process.env.IMAGE_MARKER_PLAYWRIGHT_ROOT ||
          path.join(root, 'website/node_modules/playwright'),
        'index.mjs'
      )
    ).href
  );
  browser = await chromium.launch({
    headless: true,
    ...(process.env.IMAGE_MARKER_BROWSER_CHANNEL
      ? { channel: process.env.IMAGE_MARKER_BROWSER_CHANNEL }
      : {}),
  });
  const page = await browser.newPage();
  const errors = [];
  const workerRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().includes('invisible-watermark-'))
      workerRequests.push(request.url());
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  // Network access outside the production consumer origin is denied.
  await page.route('**/*', (route) =>
    route.request().url().startsWith(origin) ? route.continue() : route.abort()
  );
  await page.goto(origin);
  await page.waitForFunction(
    () => document.querySelector('#result')?.textContent?.startsWith('{'),
    undefined,
    { timeout: 120000 }
  );
  const result = JSON.parse(await page.locator('#result').textContent());
  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.deepEqual(errors, []);
  assert(workerRequests.length > 0, 'Production Worker was requested locally');
  const summary = {
    package: `${manifest.name}@${manifest.version}`,
    source: registryVersion ? 'registry' : 'unpublished tarballs',
    browser: browser.version(),
    consumerDirectory: consumer,
    verified: [
      'normal npm install',
      'no RN/React/legacy/sharp dependency',
      'strict TypeScript skipLibCheck=false',
      'CommonJS require',
      'ESM import',
      'Vite production build',
      'offline same-origin Worker under restrictive CSP',
      ...result.checks,
    ],
    tarballs: packages.map(
      ({ filename, integrity, shasum, size, unpackedSize }) => ({
        filename,
        integrity,
        shasum,
        size,
        unpackedSize,
      })
    ),
    productionWorker: {
      filename: path.basename(workerFile),
      sha256: createHash('sha256')
        .update(await readFile(workerFile))
        .digest('hex'),
    },
  };
  await writeFile(
    path.join(
      output,
      registryVersion ? 'registry-consumer-result.json' : 'consumer-result.json'
    ),
    JSON.stringify(summary, null, 2) + '\n'
  );
  await cp(dist, path.join(output, 'consumer-dist'), { recursive: true });
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  if (!keep) await rm(consumer, { recursive: true, force: true });
  else console.log(`Preserved consumer at ${consumer}`);
}
