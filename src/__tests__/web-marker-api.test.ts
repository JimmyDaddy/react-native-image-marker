import type { ImageMarkOptions, MarkOptions, TextMarkOptions } from '../index';

const mockRenderWebComposition = jest.fn<Promise<string>, unknown[]>();
const mockRenderWebCompositionToCanvas = jest.fn<
  Promise<{
    width: number;
    height: number;
    getContext: jest.Mock;
    toDataURL: jest.Mock;
    toBlob: jest.Mock;
  }>,
  unknown[]
>();
const mockDetectInvisibleWatermarkInWorker = jest.fn();

jest.mock('../web/renderer', () => ({
  renderWebComposition: (...args: unknown[]) =>
    mockRenderWebComposition(...args),
  renderWebCompositionToCanvas: (...args: unknown[]) =>
    mockRenderWebCompositionToCanvas(...args),
}));

jest.mock('../web/invisible-worker-client', () => ({
  detectInvisibleWatermarkInWorker: (...args: unknown[]) =>
    mockDetectInvisibleWatermarkInWorker(...args),
}));

const WebMarker = require('../web').default as typeof import('../web').default;

describe('WebMarker public API', () => {
  let pixels: Uint8ClampedArray;
  let pixelContext: {
    getImageData: jest.Mock;
    putImageData: jest.Mock;
  };

  beforeEach(() => {
    mockRenderWebComposition.mockReset();
    mockRenderWebComposition.mockResolvedValue('data:image/png;base64,result');
    mockRenderWebCompositionToCanvas.mockReset();
    mockDetectInvisibleWatermarkInWorker.mockReset();
    mockDetectInvisibleWatermarkInWorker.mockResolvedValue({
      detected: false,
      confidence: 0,
      algorithm: 'dct-qim-v1',
    });
    pixels = new Uint8ClampedArray(256 * 176 * 4);
    for (let index = 0; index < 256 * 176; index += 1) {
      const value = 80 + (index % 96);
      pixels[index * 4] = value;
      pixels[index * 4 + 1] = value + 20;
      pixels[index * 4 + 2] = value + 40;
      pixels[index * 4 + 3] = 255;
    }
    pixelContext = {
      getImageData: jest.fn(() => ({ data: pixels, width: 256, height: 176 })),
      putImageData: jest.fn(),
    };
    mockRenderWebCompositionToCanvas.mockResolvedValue({
      width: 256,
      height: 176,
      getContext: jest.fn(() => pixelContext),
      toDataURL: jest.fn(() => 'data:image/png;base64,invisible'),
      toBlob: jest.fn((callback, type = 'image/png') =>
        callback(new Blob(['blob-result'], { type }))
      ),
    });
  });

  it('embeds and detects an authenticated invisible locator in browser pixels', async () => {
    const options = {
      image: { src: '/background.jpg' },
      payload: 'asset-42',
      key: '0123456789abcdef',
      saveFormat: 'png' as const,
    };

    await expect(WebMarker.embedInvisible(options)).resolves.toBe(
      'data:image/png;base64,invisible'
    );
    expect(pixelContext.putImageData).toHaveBeenCalledTimes(1);
    expect(mockRenderWebCompositionToCanvas).toHaveBeenCalledWith(
      options.image,
      [],
      expect.objectContaining({ saveFormat: 'png' })
    );

    await expect(
      WebMarker.detectInvisible({
        image: options.image,
        key: options.key,
      })
    ).resolves.toEqual(
      expect.objectContaining({
        detected: true,
        payload: 'asset-42',
        algorithm: 'dct-qim-v1',
      })
    );
  });

  it('explains CORS failures before pixel detection', async () => {
    const securityError = new Error('tainted');
    securityError.name = 'SecurityError';
    pixelContext.getImageData.mockImplementation(() => {
      throw securityError;
    });

    await expect(
      WebMarker.detectInvisible({
        image: { src: 'https://cdn.example/photo.jpg' },
        key: '0123456789abcdef',
      })
    ).rejects.toThrow('Configure CORS');
  });

  it('uses the explicitly configured Worker after browser decoding', async () => {
    const worker = {
      scriptUrl: '/worker/invisible-watermark.js',
      onProgress: jest.fn(),
    };
    const options = {
      image: { src: '/background.jpg' },
      key: '0123456789abcdef',
      strength: 'robust' as const,
      worker,
    };

    await WebMarker.detectInvisible(options);

    expect(mockDetectInvisibleWatermarkInWorker).toHaveBeenCalledWith(
      { data: pixels, width: 256, height: 176 },
      options,
      worker
    );
  });

  it('maps markText options to ordered web text layers', async () => {
    const options: TextMarkOptions = {
      backgroundImage: { src: '/background.jpg' },
      watermarkTexts: [
        { text: 'first' },
        { text: 'second', position: { X: '10%', Y: 20 } },
      ],
      quality: 91,
    };

    await expect(WebMarker.markText(options)).resolves.toBe(
      'data:image/png;base64,result'
    );
    expect(mockRenderWebComposition).toHaveBeenCalledWith(
      options.backgroundImage,
      [
        { type: 'text', options: options.watermarkTexts[0] },
        { type: 'text', options: options.watermarkTexts[1] },
      ],
      options
    );
  });

  it('creates reusable Web recipes through the public Marker API', async () => {
    const recipe = WebMarker.createRecipe({
      watermarks: [{ type: 'text', text: 'Reusable' }],
      saveFormat: 'png' as ImageMarkOptions['saveFormat'],
    });

    await expect(
      recipe.apply({ backgroundImage: { src: '/background.jpg' } })
    ).resolves.toBe('data:image/png;base64,result');
    expect(mockRenderWebComposition).toHaveBeenCalledTimes(1);
    expect(mockRenderWebComposition.mock.calls[0]?.[1]).toEqual([
      {
        type: 'text',
        options: expect.objectContaining({ type: 'text', text: 'Reusable' }),
      },
    ]);
  });

  it('returns encoded bytes only for explicitly requested Blob recipes', async () => {
    const recipe = WebMarker.createRecipe(
      {
        watermarks: [{ type: 'text', text: 'Reusable' }],
        saveFormat: 'jpg' as ImageMarkOptions['saveFormat'],
        quality: 84,
      },
      { resultType: 'blob' }
    );

    const result = await recipe.apply({
      backgroundImage: { src: '/background.jpg' },
    });

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('image/jpeg');
    expect(mockRenderWebComposition).not.toHaveBeenCalled();
    expect(mockRenderWebCompositionToCanvas).toHaveBeenCalledWith(
      { src: '/background.jpg' },
      [
        {
          type: 'text',
          options: expect.objectContaining({ type: 'text', text: 'Reusable' }),
        },
      ],
      expect.objectContaining({ quality: 84, saveFormat: 'jpg' })
    );
  });

  it('caps public Web recipe batches at four active renders', async () => {
    let active = 0;
    let maximumActive = 0;
    mockRenderWebComposition.mockImplementation(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return 'data:image/png;base64,result';
    });
    const recipe = WebMarker.createRecipe({
      watermarks: [{ type: 'text', text: 'Reusable' }],
    });

    await recipe.applyMany(
      Array.from({ length: 8 }, (_, index) => ({
        backgroundImage: { src: `/background-${index}.jpg` },
      })),
      { concurrency: 8 }
    );

    expect(maximumActive).toBe(4);
  });

  it('caps public Web invisible batches at four active renders', async () => {
    let active = 0;
    let maximumActive = 0;
    mockRenderWebCompositionToCanvas.mockImplementation(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      const itemPixels = pixels.slice();
      const context = {
        getImageData: jest.fn(() => ({
          data: itemPixels,
          width: 256,
          height: 176,
        })),
        putImageData: jest.fn(),
      };
      return {
        width: 256,
        height: 176,
        getContext: jest.fn(() => context),
        toDataURL: jest.fn(() => 'data:image/png;base64,invisible'),
        toBlob: jest.fn(),
      };
    });

    const results = await WebMarker.embedInvisibleMany(
      Array.from({ length: 8 }, (_, index) => ({
        image: { src: `/background-${index}.jpg` },
        payload: `asset-${index}`,
        key: `0123456789abcde${index}`,
      })),
      { concurrency: 8 }
    );

    expect(maximumActive).toBe(4);
    expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
  });

  it('keeps image arrays before the legacy image compatibility layer', async () => {
    const options: ImageMarkOptions = {
      backgroundImage: { src: '/background.jpg' },
      watermarkImages: [{ src: '/logo-a.png' }, { src: '/logo-b.png' }],
      watermarkImage: { src: '/legacy.png', position: { X: 99, Y: 98 } },
      watermarkPositions: { X: 12, Y: 16 },
    };

    await WebMarker.markImage(options);

    expect(mockRenderWebComposition.mock.calls[0]?.[1]).toEqual([
      { type: 'image', options: options.watermarkImages?.[0] },
      { type: 'image', options: options.watermarkImages?.[1] },
      {
        type: 'image',
        options: {
          ...options.watermarkImage,
          position: options.watermarkPositions,
        },
      },
    ]);
  });

  it('preserves explicit mixed layer order and ignores compatibility arrays', async () => {
    const options: MarkOptions = {
      backgroundImage: { src: '/background.jpg' },
      watermarks: [
        { type: 'image', src: '/logo.png' },
        { type: 'text', text: 'over the logo' },
      ],
      watermarkTexts: [{ text: 'compatibility text' }],
    };

    await WebMarker.mark(options);

    expect(mockRenderWebComposition.mock.calls[0]?.[1]).toEqual([
      { type: 'image', options: options.watermarks?.[0] },
      { type: 'text', options: options.watermarks?.[1] },
    ]);
  });

  it('uses compatibility text and image arrays when ordered layers are absent', async () => {
    const options: MarkOptions = {
      backgroundImage: { src: '/background.jpg' },
      watermarkTexts: [{ text: 'text' }],
      watermarkImages: [{ src: '/logo.png' }],
    };

    await WebMarker.mark(options);

    expect(mockRenderWebComposition.mock.calls[0]?.[1]).toEqual([
      { type: 'text', options: options.watermarkTexts?.[0] },
      { type: 'image', options: options.watermarkImages?.[0] },
    ]);
  });

  it('rejects missing content before attempting a render', async () => {
    await expect(
      WebMarker.markText({
        backgroundImage: { src: '/background.jpg' },
        watermarkTexts: [],
      })
    ).rejects.toThrow('please set watermark text!');

    await expect(
      WebMarker.markImage({
        backgroundImage: { src: '/background.jpg' },
      })
    ).rejects.toThrow('please set mark image!');

    await expect(
      WebMarker.mark({
        backgroundImage: { src: '/background.jpg' },
      })
    ).rejects.toThrow('please set watermark text or image!');

    expect(mockRenderWebComposition).not.toHaveBeenCalled();
  });
});
