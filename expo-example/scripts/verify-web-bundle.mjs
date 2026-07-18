import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exampleRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const bundleRoot = path.join(
  exampleRoot,
  'dist',
  'web',
  '_expo',
  'static',
  'js',
  'web'
);

const bundleFiles = (await readdir(bundleRoot, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /^AppEntry-.*\.js$/.test(entry.name))
  .map((entry) => path.join(bundleRoot, entry.name));

assert.equal(
  bundleFiles.length,
  1,
  `Expected one Expo Web AppEntry bundle in ${bundleRoot}, found ${bundleFiles.length}.`
);

const bundle = await readFile(bundleFiles[0], 'utf8');

assert.match(
  bundle,
  /WebMarker requires Canvas 2D/,
  'Expo Web bundle did not include the Canvas renderer.'
);
assert.match(
  bundle,
  /Numeric React Native asset IDs are not available on web/,
  'Expo Web bundle did not include the Web image-source resolver.'
);
assert.doesNotMatch(
  bundle,
  /doesn't seem to be linked|You are not using Expo Go/,
  'Expo Web bundle unexpectedly included the native linking-error path.'
);

console.log(
  `Verified Web Canvas implementation in ${path.relative(
    exampleRoot,
    bundleFiles[0]
  )}.`
);
