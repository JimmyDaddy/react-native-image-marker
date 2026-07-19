import {
  buildInvisibleWatermarkFrame,
  createInvisibleWatermarkPermutation,
  detectInvisibleWatermarkPixelsAsync,
  detectInvisibleWatermarkPixels,
  embedInvisibleWatermarkPixels,
  encodeUtf8,
  hmacSha256,
  resizeInvisibleWatermarkPixels,
  sha256,
} from '../invisible-watermark';

const KEY = '0123456789abcdef';

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

function createPixels(width = 256, height = 176): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      pixels[index] = (x * 3 + y) % 256;
      pixels[index + 1] = (x + y * 2 + 37) % 256;
      pixels[index + 2] = (x * 2 + y * 3 + 91) % 256;
      pixels[index + 3] = 255;
    }
  }
  return pixels;
}

function cropPixels(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  left: number,
  top: number,
  right: number,
  bottom: number
): { data: Uint8ClampedArray; width: number; height: number } {
  const outputWidth = width - left - right;
  const outputHeight = height - top - bottom;
  const output = new Uint8ClampedArray(outputWidth * outputHeight * 4);
  for (let y = 0; y < outputHeight; y += 1) {
    const sourceStart = ((y + top) * width + left) * 4;
    const targetStart = y * outputWidth * 4;
    output.set(
      source.subarray(sourceStart, sourceStart + outputWidth * 4),
      targetStart
    );
  }
  return { data: output, width: outputWidth, height: outputHeight };
}

describe('invisible watermark core', () => {
  it('matches SHA-256, HMAC and frame golden vectors', () => {
    expect(hex(sha256(encodeUtf8('abc')))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
    expect(
      hex(
        hmacSha256(
          encodeUtf8('key'),
          encodeUtf8('The quick brown fox jumps over the lazy dog')
        )
      )
    ).toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
    expect(hex(buildInvisibleWatermarkFrame('asset-42', KEY))).toBe(
      '494d010861737365742d343200000000df3d807417f6'
    );
  });

  it('creates a stable one-to-one bit permutation', () => {
    const permutation = createInvisibleWatermarkPermutation(KEY);
    expect(permutation).toHaveLength(176);
    expect(new Set(permutation).size).toBe(176);
    expect(Array.from(permutation.slice(0, 8))).toEqual([
      114, 47, 36, 153, 1, 60, 116, 140,
    ]);
  });

  it('embeds and detects an authenticated payload', () => {
    const width = 256;
    const height = 176;
    const data = createPixels(width, height);
    const original = new Uint8ClampedArray(data);
    embedInvisibleWatermarkPixels(
      { data, width, height },
      { payload: 'asset-42', key: KEY, strength: 'balanced' }
    );

    let squaredError = 0;
    let colorSamples = 0;
    for (let index = 0; index < data.length; index += 1) {
      if (index % 4 === 3) continue;
      const difference = data[index]! - original[index]!;
      squaredError += difference * difference;
      colorSamples += 1;
    }
    const meanSquaredError = squaredError / colorSamples;
    const psnr = 10 * Math.log10((255 * 255) / meanSquaredError);
    expect(psnr).toBeGreaterThanOrEqual(40);

    expect(
      detectInvisibleWatermarkPixels(
        { data, width, height },
        { key: KEY, strength: 'balanced', search: 'fast' }
      )
    ).toEqual(
      expect.objectContaining({
        detected: true,
        payload: 'asset-42',
        algorithm: 'dct-qim-v1',
      })
    );
  });

  it('uses UTF-8 byte limits and preserves alpha bytes', () => {
    const width = 256;
    const height = 176;
    const data = createPixels(width, height);
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        data[(y * width + x) * 4 + 3] = 96;
      }
    }
    const alphaBefore = data.filter((_, index) => index % 4 === 3);
    embedInvisibleWatermarkPixels(
      { data, width, height },
      { payload: '汉字测试', key: KEY, strength: 'balanced' }
    );

    expect(data.filter((_, index) => index % 4 === 3)).toEqual(alphaBefore);
    expect(
      detectInvisibleWatermarkPixels(
        { data, width, height },
        { key: KEY, strength: 'balanced', search: 'fast' }
      )
    ).toEqual(expect.objectContaining({ detected: true, payload: '汉字测试' }));
    expect(() => buildInvisibleWatermarkFrame('汉字测试a', KEY)).toThrow(
      'payload must contain between 1 and 12 UTF-8 bytes.'
    );
  });

  it('uses robust grid and phase search after an uneven crop', () => {
    const width = 256;
    const height = 176;
    const data = createPixels(width, height);
    embedInvisibleWatermarkPixels(
      { data, width, height },
      { payload: 'crop-7', key: KEY, strength: 'robust' }
    );
    const cropped = cropPixels(data, width, height, 13, 7, 19, 9);

    expect(
      detectInvisibleWatermarkPixels(cropped, {
        key: KEY,
        strength: 'robust',
        search: 'robust',
      })
    ).toEqual(expect.objectContaining({ detected: true, payload: 'crop-7' }));
  }, 20_000);

  it.each([0.9, 0.95, 1.05, 1.1])(
    'recovers a locator after %sx resizing',
    (scale) => {
      const width = 256;
      const height = 176;
      const data = createPixels(width, height);
      embedInvisibleWatermarkPixels(
        { data, width, height },
        { payload: 'scale-7', key: KEY, strength: 'robust' }
      );
      const resized = resizeInvisibleWatermarkPixels(
        { data, width, height },
        Math.round(width * scale),
        Math.round(height * scale)
      );

      expect(
        detectInvisibleWatermarkPixels(resized, {
          key: KEY,
          strength: 'robust',
          search: 'robust',
        })
      ).toEqual(
        expect.objectContaining({
          detected: true,
          payload: 'scale-7',
          scale,
        })
      );
    },
    20_000
  );

  it('yields the event loop during asynchronous Web detection', async () => {
    const width = 256;
    const height = 176;
    const data = createPixels(width, height);
    embedInvisibleWatermarkPixels(
      { data, width, height },
      { payload: 'async-7', key: KEY }
    );
    let heartbeat = false;
    const detection = detectInvisibleWatermarkPixelsAsync(
      { data, width, height },
      { key: KEY, search: 'fast' }
    );
    setTimeout(() => {
      heartbeat = true;
    }, 0);

    await expect(detection).resolves.toEqual(
      expect.objectContaining({ detected: true, payload: 'async-7' })
    );
    expect(heartbeat).toBe(true);
  });

  it('does not authenticate an unmarked image or the wrong key', () => {
    const width = 256;
    const height = 176;
    const data = createPixels(width, height);
    expect(
      detectInvisibleWatermarkPixels(
        { data, width, height },
        { key: KEY, search: 'fast' }
      )
    ).toEqual({
      detected: false,
      confidence: 0,
      algorithm: 'dct-qim-v1',
    });

    embedInvisibleWatermarkPixels(
      { data, width, height },
      { payload: 'asset-42', key: KEY }
    );
    expect(
      detectInvisibleWatermarkPixels(
        { data, width, height },
        { key: 'fedcba9876543210', search: 'fast' }
      ).detected
    ).toBe(false);
  });

  it('rejects unsafe payload, key and image bounds', () => {
    expect(() => buildInvisibleWatermarkFrame('', KEY)).toThrow(
      'payload must contain between 1 and 12 UTF-8 bytes.'
    );
    expect(() => buildInvisibleWatermarkFrame('1234567890123', KEY)).toThrow(
      'payload must contain between 1 and 12 UTF-8 bytes.'
    );
    expect(() => buildInvisibleWatermarkFrame('asset', 'short')).toThrow(
      'key must contain at least 16 UTF-8 bytes.'
    );
    expect(() =>
      embedInvisibleWatermarkPixels(
        { data: createPixels(120, 88), width: 120, height: 88 },
        { payload: 'asset', key: KEY }
      )
    ).toThrow('invisible watermark images must be at least 128x88 pixels.');
  });
});
