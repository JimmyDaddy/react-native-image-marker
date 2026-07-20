import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { createRequestHandler } from '../src/service.mjs';
import { createMemoryTraceStore } from '../src/store.mjs';

const image = Buffer.from('89504e470d0a1a0a', 'hex');

/**
 * @param {Parameters<typeof createRequestHandler>[0]} options
 * @param {(baseUrl: string) => Promise<void>} callback
 */
async function withServer(options, callback) {
  const server = createServer(createRequestHandler(options));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No address');
  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

function requestBody(overrides = {}) {
  return {
    image: { base64: image.toString('base64'), mimeType: 'image/png' },
    ...overrides,
  };
}

function fakeRuntime() {
  return {
    /** @param {{image: {src: Buffer}}} options */
    embedInvisible: async ({ image: source }) =>
      Buffer.concat([source.src, Buffer.from('marked')]),
    detectInvisible: async () => ({
      detected: true,
      payload: 'asset-42',
      confidence: 0.97,
      algorithm: 'dct-qim-v1',
    }),
  };
}

test('embeds, stores, detects, and never returns the service key', async () => {
  const store = createMemoryTraceStore();
  const key = 'server-only-secret';
  await withServer(
    { runtime: fakeRuntime(), keyProvider: () => key, store },
    async (baseUrl) => {
      const embedResponse = await fetch(`${baseUrl}/v1/traces/embed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          requestBody({ locator: 'asset-42', metadata: { order: 'A7' } })
        ),
      });
      assert.equal(embedResponse.status, 200);
      const embed = /** @type {any} */ (await embedResponse.json());
      assert.equal(embed.locator, 'asset-42');
      assert.equal(embed.algorithm, 'dct-qim-v1');
      assert.equal(embed.image.mimeType, 'image/png');
      assert.ok(embed.recordId);
      assert.doesNotMatch(JSON.stringify(embed), /server-only-secret/u);

      const detectResponse = await fetch(`${baseUrl}/v1/traces/detect`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody()),
      });
      assert.equal(detectResponse.status, 200);
      const detection = /** @type {any} */ (await detectResponse.json());
      assert.equal(detection.trace.payload, 'asset-42');
      assert.deepEqual(detection.record.metadata, { order: 'A7' });
    }
  );
});

test('reports trace and credentials verification independently', async () => {
  await withServer(
    {
      runtime: fakeRuntime(),
      keyProvider: () => 'server-only-secret',
      credentials: {
        verify: async () => {
          throw new Error('private verifier detail');
        },
      },
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/v1/traces/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody()),
      });
      assert.equal(response.status, 200);
      const result = /** @type {any} */ (await response.json());
      assert.equal(result.trace.detected, true);
      assert.deepEqual(result.credentials, {
        valid: false,
        error: 'Content Credentials verification failed.',
      });
      assert.doesNotMatch(JSON.stringify(result), /private verifier detail/u);
    }
  );
});

test('signs the marked output through an injected credentials adapter', async () => {
  /** @type {Record<string, unknown> | undefined} */
  let signRequest;
  await withServer(
    {
      runtime: fakeRuntime(),
      keyProvider: () => 'server-only-secret',
      credentials: {
        sign: async (request) => {
          signRequest = request;
          return {
            image: Buffer.from('signed-image'),
            mimeType: 'image/png',
            manifestId: 'manifest-42',
          };
        },
      },
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/v1/traces/embed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          requestBody({
            locator: 'asset-42',
            claim: { title: 'Public title' },
          })
        ),
      });
      assert.equal(response.status, 200);
      const result = /** @type {any} */ (await response.json());
      assert.equal(result.manifestId, 'manifest-42');
      assert.equal(
        Buffer.from(result.image.base64, 'base64').toString(),
        'signed-image'
      );
      assert.deepEqual(signRequest, {
        image: Buffer.concat([image, Buffer.from('marked')]),
        mimeType: 'image/png',
        locator: 'asset-42',
        claim: { title: 'Public title' },
      });
    }
  );
});

test('rejects invalid inputs and oversized request bodies', async () => {
  await withServer(
    {
      runtime: fakeRuntime(),
      keyProvider: () => 'server-only-secret',
      maxBodyBytes: 128,
    },
    async (baseUrl) => {
      const unsupported = await fetch(`${baseUrl}/v1/traces/detect`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          requestBody({
            image: { base64: image.toString('base64'), mimeType: 'image/gif' },
          })
        ),
      });
      assert.equal(unsupported.status, 415);

      const invalid = await fetch(`${baseUrl}/v1/traces/embed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody({ locator: 'locator-is-too-long' })),
      });
      assert.equal(invalid.status, 400);

      const oversized = await fetch(`${baseUrl}/v1/traces/detect`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image: { base64: 'A'.repeat(512) } }),
      });
      assert.equal(oversized.status, 413);
    }
  );
});
