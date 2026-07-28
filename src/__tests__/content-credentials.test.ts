import {
  embedInvisibleWithCredentials,
  verifyContentCredentials,
  type ContentCredentialsAdapter,
} from '../content-credentials';

const watermark = {
  image: { src: 'source.jpg' },
  payload: 'asset-42',
  key: '0123456789abcdef',
} as const;

const watermarkedResult = {
  jobId: 'embed-1',
  operation: 'embedInvisible' as const,
  uri: 'watermarked.png',
  output: 'file' as const,
  format: 'png' as const,
  mimeType: 'image/png' as const,
  durationMs: 1,
};

describe('Content Credentials adapter workflow', () => {
  it('embeds before signing and returns both stages', async () => {
    const calls: string[] = [];
    const adapter: ContentCredentialsAdapter = {
      async sign(request) {
        calls.push(`sign:${request.image}`);
        expect(request).toEqual({
          image: 'watermarked.png',
          locator: 'asset-42',
          algorithm: 'dct-qim-v1',
          claim: {
            title: 'Distribution copy',
            format: 'image/png',
            generator: undefined,
            metadata: { recipient: 'internal' },
          },
        });
        return { image: 'signed.png', manifestId: 'urn:c2pa:test' };
      },
      async verify() {
        return { valid: true };
      },
    };

    await expect(
      embedInvisibleWithCredentials(
        async () => {
          calls.push('embed');
          return watermarkedResult;
        },
        {
          watermark,
          adapter,
          claim: {
            title: ' Distribution copy ',
            format: 'image/png',
            metadata: { recipient: 'internal' },
          },
        }
      )
    ).resolves.toEqual({
      watermarkedImage: watermarkedResult,
      signedImage: 'signed.png',
      manifestId: 'urn:c2pa:test',
    });
    expect(calls).toEqual(['embed', 'sign:watermarked.png']);
  });

  it('validates adapters, claims, sign results, and verification results', async () => {
    const validAdapter: ContentCredentialsAdapter = {
      async sign() {
        return { image: '' };
      },
      async verify() {
        return { valid: true };
      },
    };
    await expect(
      embedInvisibleWithCredentials(async () => watermarkedResult, {
        watermark,
        adapter: validAdapter,
        claim: { title: 'Copy' },
      })
    ).rejects.toThrow('invalid signed image');
    await expect(
      embedInvisibleWithCredentials(async () => watermarkedResult, {
        watermark,
        adapter: validAdapter,
        claim: { title: ' ' },
      })
    ).rejects.toThrow('title must not be empty');
    await expect(
      verifyContentCredentials({
        image: 'signed.png',
        adapter: {
          async sign() {
            return { image: 'signed.png' };
          },
          async verify() {
            return {} as never;
          },
        },
      })
    ).rejects.toThrow('invalid verification result');
    await expect(
      verifyContentCredentials({
        image: 'signed.png',
        adapter: {
          async sign() {
            return { image: 'signed.png' };
          },
          async verify() {
            return { valid: true, manifestId: 42 } as never;
          },
        },
      })
    ).rejects.toThrow('invalid manifest ID');
  });

  it('preserves adapter errors', async () => {
    const expected = new Error('signing service unavailable');
    await expect(
      embedInvisibleWithCredentials(async () => watermarkedResult, {
        watermark,
        claim: { title: 'Copy' },
        adapter: {
          async sign() {
            throw expected;
          },
          async verify() {
            return { valid: false };
          },
        },
      })
    ).rejects.toBe(expected);
  });

  it('signs the locator snapshot that was passed to embedding', async () => {
    const mutable = {
      image: { src: 'before.jpg' },
      payload: 'asset-42',
      key: '0123456789abcdef',
    };
    let embeddedPayload = '';
    const signedLocators: string[] = [];
    const operation = embedInvisibleWithCredentials(
      async (options) => {
        embeddedPayload = options.payload;
        await Promise.resolve();
        return watermarkedResult;
      },
      {
        watermark: mutable,
        claim: { title: 'Copy' },
        adapter: {
          async sign(request) {
            signedLocators.push(request.locator);
            return { image: 'signed.png' };
          },
          async verify() {
            return { valid: true };
          },
        },
      }
    );
    mutable.payload = 'changed';
    mutable.image.src = 'after.jpg';

    await operation;
    expect(embeddedPayload).toBe('asset-42');
    expect(signedLocators).toEqual(['asset-42']);
  });
});
