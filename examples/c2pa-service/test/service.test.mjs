import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { createRequestHandler } from '../src/service.mjs';

const png = Buffer.from('89504e470d0a1a0a', 'hex');

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

function fakeEngine() {
  return {
    sign: async (input) => ({
      image: Buffer.concat([input.image, Buffer.from('signed')]),
      mimeType: input.mimeType,
      manifestId: 'example:manifest',
    }),
    verify: async () => ({
      valid: true,
      manifestId: 'example:manifest',
      validationStatus: [],
    }),
  };
}

test('signs and verifies through an injected engine', async () => {
  await withServer({ engine: fakeEngine() }, async (baseUrl) => {
    const signResponse = await fetch(`${baseUrl}/sign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        image: { base64: png.toString('base64'), mimeType: 'image/png' },
        locator: 'asset-42',
        algorithm: 'dct-qim-v1',
        claim: { title: 'Example', format: 'image/png' },
      }),
    });
    assert.equal(signResponse.status, 200);
    const signed = await signResponse.json();
    assert.equal(signed.manifestId, 'example:manifest');
    assert.equal(
      Buffer.from(signed.image.base64, 'base64').subarray(-6).toString(),
      'signed'
    );

    const verifyResponse = await fetch(`${baseUrl}/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        image: { base64: signed.image.base64, mimeType: 'image/png' },
      }),
    });
    assert.equal(verifyResponse.status, 200);
    assert.deepEqual(await verifyResponse.json(), {
      valid: true,
      manifestId: 'example:manifest',
      validationStatus: [],
    });
  });
});

test('rejects unsupported media types and invalid base64', async () => {
  await withServer({ engine: fakeEngine() }, async (baseUrl) => {
    const unsupported = await fetch(`${baseUrl}/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        image: { base64: png.toString('base64'), mimeType: 'image/gif' },
      }),
    });
    assert.equal(unsupported.status, 415);

    const invalid = await fetch(`${baseUrl}/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        image: { base64: 'not base64', mimeType: 'image/png' },
      }),
    });
    assert.equal(invalid.status, 400);
  });
});

test('rejects request bodies over the configured limit', async () => {
  await withServer(
    { engine: fakeEngine(), maxBodyBytes: 64 },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image: { base64: 'A'.repeat(256) } }),
      });
      assert.equal(response.status, 413);
    }
  );
});
