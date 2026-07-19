import assert from 'node:assert/strict';
import test from 'node:test';
import { createHttpContentCredentialsAdapter } from '../src/client-adapter.mjs';

test('maps data URLs to the sign and verify service contract', async () => {
  const requests = [];
  const adapter = createHttpContentCredentialsAdapter({
    baseUrl: 'https://credentials.example.com/',
    fetch: async (url, init) => {
      requests.push({ url, body: JSON.parse(String(init.body)) });
      if (String(url).endsWith('/sign')) {
        return Response.json({
          image: { mimeType: 'image/png', base64: 'c2lnbmVk' },
          manifestId: 'urn:c2pa:test',
        });
      }
      return Response.json({ valid: true, manifestId: 'urn:c2pa:test' });
    },
  });

  const signed = await adapter.sign({
    image: 'data:image/png;base64,iVBORw==',
    locator: 'asset-42',
    algorithm: 'dct-qim-v1',
    claim: { title: 'Example' },
  });
  assert.deepEqual(signed, {
    image: 'data:image/png;base64,c2lnbmVk',
    manifestId: 'urn:c2pa:test',
  });
  assert.deepEqual(await adapter.verify(signed.image), {
    valid: true,
    manifestId: 'urn:c2pa:test',
  });
  assert.deepEqual(requests, [
    {
      url: 'https://credentials.example.com/sign',
      body: {
        image: { mimeType: 'image/png', base64: 'iVBORw==' },
        locator: 'asset-42',
        algorithm: 'dct-qim-v1',
        claim: { title: 'Example' },
      },
    },
    {
      url: 'https://credentials.example.com/verify',
      body: {
        image: { mimeType: 'image/png', base64: 'c2lnbmVk' },
      },
    },
  ]);
});

test('preserves service errors and rejects unsupported image URLs', async () => {
  const adapter = createHttpContentCredentialsAdapter({
    baseUrl: 'https://credentials.example.com',
    fetch: async () =>
      Response.json({ error: 'Signing unavailable.' }, { status: 503 }),
  });

  await assert.rejects(
    adapter.verify('https://example.com/image.png'),
    /requires a JPEG or PNG data URL/
  );
  await assert.rejects(
    adapter.verify('data:image/png;base64,iVBORw=='),
    /Signing unavailable/
  );
});
