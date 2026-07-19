import assert from 'node:assert/strict';
import test from 'node:test';
import { createTraceAssertion } from '../src/c2pa-engine.mjs';

test('hashes the locator before creating the private assertion', () => {
  const assertion = createTraceAssertion('asset-42', { collection: 'demo' });

  assert.deepEqual(assertion, {
    algorithm: 'dct-qim-v1',
    locator_sha256:
      '83dbdd21217e280cf7ef11027ec96e1f43aab7e6d2fcf61a25b57aa0857c5e36',
    metadata: { collection: 'demo' },
  });
  assert.equal(JSON.stringify(assertion).includes('asset-42'), false);
});
