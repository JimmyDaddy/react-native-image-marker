import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  verifyPackageMetrics,
  verifyWebsiteBudget,
} from '../verify-size-budgets.mjs';

function createWebsiteFixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'image-marker-size-budget-')
  );
  fs.mkdirSync(path.join(root, 'public'));
  fs.mkdirSync(path.join(root, 'dist'));
  fs.writeFileSync(path.join(root, 'public', 'sample.png'), Buffer.alloc(32));
  fs.writeFileSync(path.join(root, 'dist', 'app.js'), Buffer.alloc(64));
  fs.writeFileSync(path.join(root, 'dist', 'codec.wasm'), Buffer.alloc(128));
  return root;
}

const websiteBudget = {
  sourceDirectory: 'public',
  distDirectory: 'dist',
  maxSourceBytes: 64,
  maxSourceFileBytes: 64,
  maxDistBytes: 256,
  maxJavaScriptFileBytes: 96,
  maxWasmFileBytes: 160,
};

test('accepts website artifacts within every budget', () => {
  const root = createWebsiteFixture();
  try {
    assert.deepEqual(verifyWebsiteBudget(root, websiteBudget), {
      sourceBytes: 32,
      distBytes: 192,
      largestJavaScriptBytes: 64,
      largestWasmBytes: 128,
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('reports the offending website artifact', () => {
  const root = createWebsiteFixture();
  fs.writeFileSync(path.join(root, 'dist', 'large.js'), Buffer.alloc(97));
  try {
    assert.throws(
      () =>
        verifyWebsiteBudget(root, {
          ...websiteBudget,
          maxDistBytes: 512,
        }),
      /Largest website JavaScript file.*large\.js/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('checks packed and unpacked npm package sizes', () => {
  assert.doesNotThrow(() =>
    verifyPackageMetrics(
      { name: 'example', size: 100, unpackedSize: 200 },
      { name: 'example', maxPackedBytes: 100, maxUnpackedBytes: 200 }
    )
  );
  assert.throws(
    () =>
      verifyPackageMetrics(
        { name: 'example', size: 101, unpackedSize: 200 },
        { name: 'example', maxPackedBytes: 100, maxUnpackedBytes: 200 }
      ),
    /packed tarball/
  );
});
