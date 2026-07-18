import type { ImageMarkOptions, MarkOptions, TextMarkOptions } from '../index';

const mockRenderWebComposition = jest.fn<Promise<string>, unknown[]>();

jest.mock('../web/renderer', () => ({
  renderWebComposition: (...args: unknown[]) =>
    mockRenderWebComposition(...args),
}));

const WebMarker = require('../web').default as typeof import('../web').default;

describe('WebMarker public API', () => {
  beforeEach(() => {
    mockRenderWebComposition.mockReset();
    mockRenderWebComposition.mockResolvedValue('data:image/png;base64,result');
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
