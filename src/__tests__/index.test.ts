function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach((nestedValue) => {
      deepFreeze(nestedValue);
    });
    Object.freeze(value);
  }
  return value;
}

function markerResult(uri: string) {
  return expect.objectContaining({ uri });
}

describe('Marker JS wrapper', () => {
  let Marker: any;
  let ImageFormat: any;
  let Position: any;
  let RotationCanvasMode: any;
  let nativeModule: {
    markWithText: jest.Mock;
    markWithImage: jest.Mock;
    markWithWatermarks: jest.Mock;
    embedInvisible: jest.Mock;
    detectInvisible: jest.Mock;
    cancel: jest.Mock;
  };
  let resolveAssetSource: jest.Mock;

  beforeEach(() => {
    jest.resetModules();

    const reactNative = require('react-native');
    nativeModule = {
      markWithText: jest.fn(),
      markWithImage: jest.fn(),
      markWithWatermarks: jest.fn(),
      embedInvisible: jest.fn(),
      detectInvisible: jest.fn(),
      cancel: jest.fn().mockResolvedValue(true),
    };
    reactNative.NativeModules.ImageMarker = nativeModule;
    reactNative.Image.resolveAssetSource = jest.fn();
    resolveAssetSource = reactNative.Image.resolveAssetSource;
    resolveAssetSource.mockImplementation((source) => {
      if (typeof source === 'number') {
        return {
          uri: `asset://${source}`,
          width: 120,
          height: 80,
          scale: 1,
        };
      }
      return undefined;
    });

    const moduleExports = require('../index');
    Marker = moduleExports.default;
    ImageFormat = moduleExports.ImageFormat;
    Position = moduleExports.Position;
    RotationCanvasMode = moduleExports.RotationCanvasMode;
  });

  it('exports stable rotation canvas mode values', () => {
    expect(RotationCanvasMode).toEqual({
      expand: 'expand',
      crop: 'crop',
    });
  });

  it('normalizes native invisible watermark input and parses detection data', async () => {
    nativeModule.embedInvisible.mockResolvedValue('/tmp/invisible.png');
    nativeModule.detectInvisible.mockResolvedValue(
      JSON.stringify({
        detected: true,
        payload: 'asset-42',
        confidence: 0.94,
        bitErrorRate: 0.03,
        scale: 0.95,
        algorithm: 'dct-qim-v1',
      })
    );

    await expect(
      Marker.embedInvisible({
        image: { src: 10 },
        payload: 'asset-42',
        key: '0123456789abcdef',
        strength: 'robust',
      })
    ).resolves.toEqual(markerResult('/tmp/invisible.png'));
    expect(nativeModule.embedInvisible).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundImage: expect.objectContaining({
          src: expect.objectContaining({ uri: 'asset://10' }),
        }),
        payload: 'asset-42',
        key: '0123456789abcdef',
        strength: 'robust',
        maxSize: 2048,
      })
    );

    await expect(
      Marker.detectInvisible({
        image: { src: 'file:///tmp/invisible.png' },
        key: '0123456789abcdef',
        search: 'robust',
      })
    ).resolves.toEqual(
      expect.objectContaining({
        detected: true,
        payload: 'asset-42',
        scale: 0.95,
      })
    );
    expect(nativeModule.detectInvisible).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'robust',
        maxSize: 2048,
        backgroundImage: expect.objectContaining({
          src: expect.objectContaining({
            uri: 'file:///tmp/invisible.png',
          }),
        }),
      })
    );
  });

  it('rejects malformed native invisible watermark results', async () => {
    nativeModule.detectInvisible.mockResolvedValue('{invalid');
    await expect(
      Marker.detectInvisible({
        image: { src: 'file:///tmp/invisible.png' },
        key: '0123456789abcdef',
      })
    ).rejects.toThrow('invalid JSON');

    nativeModule.detectInvisible.mockResolvedValue(
      JSON.stringify({
        detected: true,
        payload: 'asset-42',
        confidence: 0.9,
        algorithm: 'dct-qim-v1',
        scale: 2,
      })
    );
    await expect(
      Marker.detectInvisible({
        image: { src: 'file:///tmp/invisible.png' },
        key: '0123456789abcdef',
      })
    ).rejects.toThrow('invalid data');
  });

  it('creates reusable native recipes through the public Marker API', async () => {
    nativeModule.markWithWatermarks.mockResolvedValue('/tmp/recipe.jpg');
    const recipe = Marker.createRecipe({
      layers: [{ type: 'text', text: 'Reusable' }],
      output: { quality: 88 },
    });

    await expect(
      recipe.apply({
        backgroundImage: { src: 'file:///tmp/background.jpg' },
        filename: 'recipe-output',
      })
    ).resolves.toEqual(markerResult('/tmp/recipe.jpg'));
    expect(nativeModule.markWithWatermarks).toHaveBeenCalledWith(
      expect.objectContaining({
        quality: 88,
        filename: 'recipe-output',
        maxSize: 2048,
        watermarks: [
          expect.objectContaining({ type: 'text', text: 'Reusable' }),
        ],
      })
    );
  });

  it('rejects Web-only Blob recipe output on native targets', () => {
    expect(() =>
      Marker.createRecipe(
        { layers: [{ type: 'text', text: 'Reusable' }] },
        { resultType: 'blob' }
      )
    ).toThrow('Blob recipe output is only supported on Web.');
  });

  it('keeps public native recipe batches serial', async () => {
    let active = 0;
    let maximumActive = 0;
    nativeModule.markWithWatermarks.mockImplementation(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return '/tmp/recipe.jpg';
    });
    const recipe = Marker.createRecipe({
      layers: [{ type: 'text', text: 'Reusable' }],
    });

    const results = await recipe.applyMany(
      [1, 2, 3].map((src) => ({ backgroundImage: { src } })),
      { concurrency: 3 }
    );

    expect(maximumActive).toBe(1);
    expect(
      results.every(
        (result: { status: string }) => result.status === 'fulfilled'
      )
    ).toBe(true);
  });

  it('keeps native invisible batches serial and isolates item failures', async () => {
    let active = 0;
    let maximumActive = 0;
    nativeModule.embedInvisible.mockImplementation(async (options) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      if (options.payload === 'recipient-2') throw new Error('write failed');
      return `/tmp/${options.payload}.png`;
    });

    const results = await Marker.embedInvisibleMany(
      [1, 2, 3].map((src, index) => ({
        image: { src },
        payload: `recipient-${index + 1}`,
        key: `0123456789abcde${index}`,
      })),
      { concurrency: 3 }
    );

    expect(maximumActive).toBe(1);
    expect(results).toEqual([
      {
        status: 'fulfilled',
        value: markerResult('/tmp/recipient-1.png'),
      },
      {
        status: 'rejected',
        reason: expect.objectContaining({ message: 'write failed' }),
      },
      {
        status: 'fulfilled',
        value: markerResult('/tmp/recipient-3.png'),
      },
    ]);
    expect(
      nativeModule.embedInvisible.mock.calls.map(([value]) => value.payload)
    ).toEqual(['recipient-1', 'recipient-2', 'recipient-3']);
  });

  it('normalizes markText options before calling the native module', async () => {
    nativeModule.markWithText.mockResolvedValue('/tmp/text.png');
    const options = {
      backgroundImage: {
        src: 'file:///tmp/background.png',
        scale: 1,
      },
      watermarkTexts: [
        {
          text: 'Hello',
          position: {
            position: Position.topRight,
            X: 12,
            Y: '5%',
            edgeInset: 0,
          },
          style: {
            fontSizeRatio: 0.04,
          },
        },
      ],
      quality: 90,
      saveFormat: ImageFormat.png,
      matteColor: '#F4F1EA',
      rotationCanvasMode: RotationCanvasMode.crop,
    };
    deepFreeze(options);

    await expect(Marker.markText(options)).resolves.toEqual(
      markerResult('/tmp/text.png')
    );

    expect(nativeModule.markWithText).toHaveBeenCalledTimes(1);
    expect(nativeModule.markWithText).toHaveBeenCalledWith(
      expect.objectContaining({
        maxSize: 2048,
        quality: 90,
        saveFormat: ImageFormat.png,
        matteColor: '#F4F1EA',
        rotationCanvasMode: RotationCanvasMode.crop,
      })
    );
    const nativeOptions = nativeModule.markWithText.mock.calls[0][0];
    expect(nativeOptions.backgroundImage.src).toEqual({
      uri: 'file:///tmp/background.png',
    });
    expect(nativeOptions.watermarkTexts[0].position).toEqual({
      position: Position.topRight,
      X: '12',
      Y: '5%',
      edgeInset: '0',
    });
    expect(options.backgroundImage.src).toBe('file:///tmp/background.png');
    expect(options.watermarkTexts[0]).toHaveProperty('position');
    expect(nativeOptions.watermarkTexts[0].position).not.toBe(
      options.watermarkTexts[0].position
    );
  });

  it('forwards AbortSignal cancellation to the native job ID', async () => {
    const controller = new AbortController();
    nativeModule.markWithText.mockImplementation(
      () => new Promise<string>(() => {})
    );

    const operation = Marker.markText(
      {
        backgroundImage: { src: 'file:///tmp/background.png' },
        watermarkTexts: [{ text: 'Cancel me' }],
      },
      { signal: controller.signal }
    );
    const jobId = nativeModule.markWithText.mock.calls[0][0].jobId;
    controller.abort();

    await expect(operation).rejects.toEqual(
      expect.objectContaining({ code: 'ABORTED', jobId })
    );
    expect(nativeModule.cancel).toHaveBeenCalledWith(jobId);
  });

  it('resolves markImage assets and preserves explicit maxSize', async () => {
    nativeModule.markWithImage.mockResolvedValue('/tmp/image.png');
    const options = {
      backgroundImage: {
        src: 10,
        scale: 1,
      },
      watermarkImages: [
        {
          src: 'file:///tmp/watermark.png',
          position: {
            position: Position.bottomRight,
            X: '10%',
            Y: 20,
            edgeInset: 0,
          },
          scale: 0.5,
          trimTransparentPadding: true,
        },
      ],
      maxSize: 1024,
      saveFormat: ImageFormat.jpg,
      matteColor: '#123456',
      rotationCanvasMode: RotationCanvasMode.expand,
    };
    deepFreeze(options);

    await expect(Marker.markImage(options)).resolves.toEqual(
      markerResult('/tmp/image.png')
    );

    expect(nativeModule.markWithImage).toHaveBeenCalledTimes(1);
    const nativeOptions = nativeModule.markWithImage.mock.calls[0][0];
    expect(nativeOptions.maxSize).toBe(1024);
    expect(nativeOptions.matteColor).toBe('#123456');
    expect(nativeOptions.rotationCanvasMode).toBe(RotationCanvasMode.expand);
    expect(nativeOptions.backgroundImage.src).toEqual({
      uri: 'asset://10',
      width: 120,
      height: 80,
      scale: 1,
    });
    expect(nativeOptions.watermarkImages[0].src).toEqual({
      uri: 'file:///tmp/watermark.png',
    });
    expect(nativeOptions.watermarkImages[0]).toEqual(
      expect.objectContaining({
        trimTransparentPadding: true,
      })
    );
    expect(nativeOptions.watermarkImages[0].position).toEqual({
      position: Position.bottomRight,
      X: '10%',
      Y: '20',
      edgeInset: '0',
    });
    expect(nativeOptions.watermarkImages[0].position).not.toBe(
      options.watermarkImages[0].position
    );
    expect(options.backgroundImage.src).toBe(10);
    expect(options.watermarkImages[0].src).toBe('file:///tmp/watermark.png');
  });

  it('rejects the removed singular image watermark shape with migration guidance', () => {
    expect(() =>
      Marker.markImage({
        backgroundImage: {
          src: 'file:///tmp/background.png',
        },
        watermarkImage: {
          src: 'file:///tmp/legacy-watermark.png',
          alpha: 0.75,
        },
      } as any)
    ).toThrow('watermarkImage and watermarkPositions were removed in v2');
  });

  it('rejects markImage calls without any image watermark', () => {
    expect(() =>
      Marker.markImage({
        backgroundImage: {
          src: 'file:///tmp/background.png',
        },
      } as any)
    ).toThrow('please set mark image!');
  });

  it('rejects image watermark entries without a source', () => {
    expect(() =>
      Marker.markImage({
        backgroundImage: {
          src: 'file:///tmp/background.png',
        },
        watermarkImages: [
          {
            position: {
              position: Position.center,
            },
          },
        ],
      } as any)
    ).toThrow('please set mark image!');
  });

  it('rejects invalid quality values in every public marking API', () => {
    const invalidQualityValues = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -1,
      101,
      50.5,
    ];

    invalidQualityValues.forEach((quality) => {
      expect(() =>
        Marker.markText({
          backgroundImage: { src: 'file:///tmp/background.png' },
          watermarkTexts: [{ text: 'quality' }],
          quality,
        })
      ).toThrow('quality must be a finite integer between 0 and 100.');

      expect(() =>
        Marker.markImage({
          backgroundImage: { src: 'file:///tmp/background.png' },
          watermarkImages: [{ src: 'file:///tmp/watermark.png' }],
          quality,
        })
      ).toThrow('quality must be a finite integer between 0 and 100.');

      expect(() =>
        Marker.mark({
          backgroundImage: { src: 'file:///tmp/background.png' },
          watermarks: [{ type: 'text', text: 'quality' }],
          quality,
        })
      ).toThrow('quality must be a finite integer between 0 and 100.');
    });

    expect(nativeModule.markWithText).not.toHaveBeenCalled();
    expect(nativeModule.markWithImage).not.toHaveBeenCalled();
    expect(nativeModule.markWithWatermarks).not.toHaveBeenCalled();
  });

  it('rejects invalid maxSize values before native normalization', () => {
    for (const maxSize of [0, -1, 10.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        Marker.markImage({
          backgroundImage: { src: 'file:///tmp/background.png' },
          watermarkImages: [{ src: 'file:///tmp/watermark.png' }],
          maxSize,
        })
      ).toThrow('maxSize must be a positive finite integer.');
    }

    expect(nativeModule.markWithImage).not.toHaveBeenCalled();
  });

  it('preserves text stroke options without mutating the caller input', async () => {
    nativeModule.markWithText.mockResolvedValue('/tmp/outlined-text.png');
    const options = {
      backgroundImage: { src: 'file:///tmp/background.png' },
      watermarkTexts: [
        {
          text: 'Outlined',
          style: {
            color: '#FFFFFF',
            strokeStyle: { color: '#00000099', width: 2 },
          },
        },
      ],
    };
    deepFreeze(options);

    await expect(Marker.markText(options)).resolves.toEqual(
      markerResult('/tmp/outlined-text.png')
    );

    const nativeStroke =
      nativeModule.markWithText.mock.calls[0][0].watermarkTexts[0].style
        .strokeStyle;
    expect(nativeStroke).toEqual({ color: '#00000099', width: 2 });
    expect(nativeStroke).not.toBe(options.watermarkTexts[0].style.strokeStyle);
  });

  it('rejects invalid text stroke styles before rendering', () => {
    for (const width of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        Marker.markText({
          backgroundImage: { src: 'file:///tmp/background.png' },
          watermarkTexts: [
            {
              text: 'Invalid outline',
              style: { strokeStyle: { color: '#000000', width } },
            },
          ],
        })
      ).toThrow(
        'watermarkTexts[0].style.strokeStyle.width must be a non-negative finite number.'
      );
    }

    expect(() =>
      Marker.mark({
        backgroundImage: { src: 'file:///tmp/background.png' },
        watermarks: [
          {
            type: 'text',
            text: 'Invalid outline',
            style: { strokeStyle: { color: '  ', width: 2 } },
          },
        ],
      })
    ).toThrow(
      'watermarks[0].style.strokeStyle.color must be a non-empty string.'
    );

    expect(nativeModule.markWithText).not.toHaveBeenCalled();
    expect(nativeModule.markWithWatermarks).not.toHaveBeenCalled();
  });

  it('accepts quality and alpha boundary values', async () => {
    nativeModule.markWithText.mockResolvedValue('/tmp/boundary-text.png');
    nativeModule.markWithWatermarks.mockResolvedValue(
      '/tmp/boundary-watermarks.png'
    );

    await expect(
      Marker.markText({
        backgroundImage: {
          src: 'file:///tmp/background.png',
          alpha: 0,
        },
        watermarkTexts: [{ text: 'boundary', alpha: 0 }],
        quality: 0,
      })
    ).resolves.toEqual(markerResult('/tmp/boundary-text.png'));

    await expect(
      Marker.mark({
        backgroundImage: {
          src: 'file:///tmp/background.png',
          alpha: 1,
        },
        watermarkImages: [
          {
            src: 'file:///tmp/watermark.png',
            alpha: 1,
          },
        ],
        watermarks: [
          {
            type: 'image',
            src: 'file:///tmp/mixed-watermark.png',
            alpha: 0,
          },
          {
            type: 'text',
            text: 'boundary',
            alpha: 1,
          },
        ],
        quality: 100,
      })
    ).resolves.toEqual(markerResult('/tmp/boundary-watermarks.png'));
  });

  it('preserves tiled layouts without mutating caller input', async () => {
    nativeModule.markWithWatermarks.mockResolvedValue('/tmp/tiled.png');
    const options = {
      backgroundImage: { src: 'file:///tmp/background.png' },
      watermarks: [
        {
          type: 'text' as const,
          text: 'CONFIDENTIAL',
          layout: {
            type: 'tile' as const,
            gapX: '8%',
            gapY: 24,
            stagger: true,
          },
        },
      ],
    };
    deepFreeze(options);

    await expect(Marker.mark(options)).resolves.toEqual(
      markerResult('/tmp/tiled.png')
    );

    const nativeLayout =
      nativeModule.markWithWatermarks.mock.calls[0][0].watermarks[0].layout;
    expect(nativeLayout).toEqual({
      type: 'tile',
      gapX: '8%',
      gapY: '24',
      stagger: true,
    });
    expect(nativeLayout).not.toBe(options.watermarks[0].layout);
    expect(
      nativeModule.markWithWatermarks.mock.calls[0][0].watermarks[0]
    ).not.toHaveProperty('position');

    nativeModule.markWithText.mockResolvedValue('/tmp/tiled-text.png');
    await Marker.markText({
      backgroundImage: { src: 'file:///tmp/background.png' },
      watermarkTexts: [
        { text: 'Tiled text', layout: { type: 'tile', gapX: 12 } },
      ],
    });
    expect(
      nativeModule.markWithText.mock.calls[0][0].watermarkTexts[0]
    ).not.toHaveProperty('position');
  });

  it('rejects tiled layouts combined with position or invalid spacing', () => {
    expect(() =>
      Marker.markText({
        backgroundImage: { src: 'file:///tmp/background.png' },
        watermarkTexts: [
          {
            text: 'Conflict',
            position: { position: Position.center },
            layout: { type: 'tile' },
          },
        ],
      })
    ).toThrow('watermarkTexts[0].layout cannot be combined with position.');

    expect(() =>
      Marker.markImage({
        backgroundImage: { src: 'file:///tmp/background.png' },
        watermarkImages: [
          {
            src: 'file:///tmp/logo.png',
            layout: { type: 'tile', gapX: '-1%' },
          },
        ],
      })
    ).toThrow('watermarkImages[0].layout.gapX must be non-negative.');

    expect(() =>
      Marker.markImage({
        backgroundImage: { src: 'file:///tmp/background.png' },
        watermarkImages: [
          {
            src: 'file:///tmp/logo.png',
            position: { position: Position.center },
            layout: { type: 'tile' },
          },
        ],
      })
    ).toThrow('watermarkImages[0].layout cannot be combined with position.');

    expect(() =>
      Marker.mark({
        backgroundImage: { src: 'file:///tmp/background.png' },
        watermarks: [
          {
            type: 'image',
            src: 'file:///tmp/logo.png',
            layout: { type: 'tile', offsetY: 'not-a-number' },
          },
        ],
      })
    ).toThrow(
      'watermarks[0].layout.offsetY must be a finite number or percentage.'
    );

    expect(() =>
      Marker.markText({
        backgroundImage: { src: 'file:///tmp/background.png' },
        watermarkTexts: [
          {
            text: 'Single',
            layout: { type: 'single', gapX: 'not-a-number' } as any,
          },
        ],
      })
    ).toThrow(
      'watermarkTexts[0].layout.gapX must be a finite number or percentage.'
    );

    expect(() =>
      Marker.markText({
        backgroundImage: { src: 'file:///tmp/background.png' },
        watermarkTexts: [{ text: 'Array', layout: [] as any }],
      })
    ).toThrow('watermarkTexts[0].layout must be an object.');

    expect(nativeModule.markWithText).not.toHaveBeenCalled();
    expect(nativeModule.markWithImage).not.toHaveBeenCalled();
    expect(nativeModule.markWithWatermarks).not.toHaveBeenCalled();
  });

  it('rejects invalid alpha values at every image and text layer location', () => {
    const invalidCases = [
      {
        invoke: () =>
          Marker.markText({
            backgroundImage: {
              src: 'file:///tmp/background.png',
              alpha: Number.NaN,
            },
            watermarkTexts: [{ text: 'background alpha' }],
          }),
        path: 'backgroundImage',
      },
      {
        invoke: () =>
          Marker.markImage({
            backgroundImage: { src: 'file:///tmp/background.png' },
            watermarkImages: [
              {
                src: 'file:///tmp/legacy-watermark.png',
                alpha: -0.01,
              },
            ],
          }),
        path: 'watermarkImages[0]',
      },
      {
        invoke: () =>
          Marker.markImage({
            backgroundImage: { src: 'file:///tmp/background.png' },
            watermarkImages: [
              {
                src: 'file:///tmp/watermark.png',
                alpha: 1.01,
              },
            ],
          }),
        path: 'watermarkImages[0]',
      },
      {
        invoke: () =>
          Marker.mark({
            backgroundImage: { src: 'file:///tmp/background.png' },
            watermarks: [
              { type: 'text', text: 'first layer' },
              {
                type: 'image',
                src: 'file:///tmp/mixed-watermark.png',
                alpha: Number.POSITIVE_INFINITY,
              },
            ],
          }),
        path: 'watermarks[1]',
      },
      {
        invoke: () =>
          Marker.markText({
            backgroundImage: { src: 'file:///tmp/background.png' },
            watermarkTexts: [{ text: 'transparent text', alpha: Number.NaN }],
          }),
        path: 'watermarkTexts[0]',
      },
      {
        invoke: () =>
          Marker.mark({
            backgroundImage: { src: 'file:///tmp/background.png' },
            watermarks: [
              { type: 'text', text: 'transparent text', alpha: -0.01 },
            ],
          }),
        path: 'watermarks[0]',
      },
    ];

    invalidCases.forEach(({ invoke, path }) => {
      expect(invoke).toThrow(
        `${path}.alpha must be a finite number between 0 and 1.`
      );
    });

    expect(nativeModule.markWithText).not.toHaveBeenCalled();
    expect(nativeModule.markWithImage).not.toHaveBeenCalled();
    expect(nativeModule.markWithWatermarks).not.toHaveBeenCalled();
  });

  it('preserves supported blend modes and rejects unknown modes before native calls', async () => {
    nativeModule.markWithWatermarks.mockResolvedValue('/tmp/blended.png');
    await expect(
      Marker.mark({
        backgroundImage: { src: 'file:///tmp/background.png' },
        watermarks: [
          {
            type: 'image',
            src: 'file:///tmp/logo.png',
            blendMode: 'multiply',
          },
          { type: 'text', text: 'Light', blendMode: 'screen' },
        ],
      })
    ).resolves.toEqual(markerResult('/tmp/blended.png'));
    expect(nativeModule.markWithWatermarks.mock.calls[0][0].watermarks).toEqual(
      [
        expect.objectContaining({ blendMode: 'multiply' }),
        expect.objectContaining({ blendMode: 'screen' }),
      ]
    );

    nativeModule.markWithWatermarks.mockClear();
    expect(() =>
      Marker.mark({
        backgroundImage: { src: 'file:///tmp/background.png' },
        watermarks: [
          {
            type: 'text',
            text: 'Invalid',
            blendMode: 'difference' as any,
          },
        ],
      })
    ).toThrow('watermarks[0].blendMode is not supported: difference.');
    expect(nativeModule.markWithWatermarks).not.toHaveBeenCalled();
  });

  it('sends compatibility text and image arrays as ordered native layers', async () => {
    nativeModule.markWithWatermarks.mockResolvedValueOnce('/tmp/final.jpg');
    const options = {
      backgroundImage: {
        src: 'file:///tmp/background.png',
        scale: 0.8,
      },
      watermarkTexts: [
        {
          text: 'Mixed',
          position: {
            position: Position.bottomCenter,
            Y: 24,
          },
          style: {
            color: '#ffffff',
            fontSize: 32,
            shadowStyle: {
              dx: 2,
              dy: 3,
              radius: 4,
              color: '#000000',
            },
          },
        },
      ],
      watermarkImages: [
        {
          src: 12,
          position: {
            position: Position.topRight,
            X: 20,
            Y: 16,
            edgeInset: 4,
          },
          scale: 0.5,
          trimTransparentPadding: true,
        },
      ],
      quality: 82,
      filename: 'mixed-output',
      saveFormat: ImageFormat.jpg,
      matteColor: '#FAFAFA',
      rotationCanvasMode: RotationCanvasMode.crop,
    };
    deepFreeze(options);

    await expect(Marker.mark(options)).resolves.toEqual(
      markerResult('/tmp/final.jpg')
    );

    expect(nativeModule.markWithText).not.toHaveBeenCalled();
    expect(nativeModule.markWithImage).not.toHaveBeenCalled();
    expect(nativeModule.markWithWatermarks).toHaveBeenCalledTimes(1);
    const nativeOptions = nativeModule.markWithWatermarks.mock.calls[0][0];

    expect(nativeOptions).toEqual(
      expect.objectContaining({
        quality: 82,
        filename: 'mixed-output',
        saveFormat: ImageFormat.jpg,
        matteColor: '#FAFAFA',
        rotationCanvasMode: RotationCanvasMode.crop,
        maxSize: 2048,
      })
    );
    expect(nativeOptions.backgroundImage.src).toEqual({
      uri: 'file:///tmp/background.png',
    });
    expect(nativeOptions.watermarks).toHaveLength(2);
    expect(nativeOptions.watermarks[0]).toEqual(
      expect.objectContaining({
        type: 'text',
        text: 'Mixed',
      })
    );
    expect(nativeOptions.watermarks[0].position).toEqual({
      position: Position.bottomCenter,
      Y: '24',
    });
    expect(nativeOptions.watermarks[1]).toEqual(
      expect.objectContaining({
        type: 'image',
        scale: 0.5,
        trimTransparentPadding: true,
      })
    );
    expect(nativeOptions.watermarks[1].src).toEqual({
      uri: 'asset://12',
      width: 120,
      height: 80,
      scale: 1,
    });
    expect(options.watermarkTexts[0]).toHaveProperty('position');
    expect(options.watermarkImages[0].src).toBe(12);
    expect(nativeOptions.watermarks[1].position).toEqual({
      position: Position.topRight,
      X: '20',
      Y: '16',
      edgeInset: '4',
    });
    expect(nativeOptions.watermarks[1].position).not.toBe(
      options.watermarkImages[0].position
    );
  });

  it('preserves explicit watermarks layer order', async () => {
    nativeModule.markWithWatermarks.mockResolvedValueOnce('/tmp/final.png');

    await expect(
      Marker.mark({
        backgroundImage: {
          src: 'file:///tmp/background.png',
        },
        watermarks: [
          {
            type: 'image',
            src: 'file:///tmp/watermark.png',
            position: {
              position: Position.topLeft,
            },
          },
          {
            type: 'text',
            text: 'Final text',
            position: {
              position: Position.bottomRight,
            },
          },
        ],
        saveFormat: ImageFormat.png,
      })
    ).resolves.toEqual(markerResult('/tmp/final.png'));

    expect(nativeModule.markWithWatermarks).toHaveBeenCalledTimes(1);
    const nativeOptions = nativeModule.markWithWatermarks.mock.calls[0][0];
    expect(nativeOptions).toEqual(
      expect.objectContaining({
        saveFormat: ImageFormat.png,
      })
    );
    expect(nativeOptions.watermarks.map((layer: any) => layer.type)).toEqual([
      'image',
      'text',
    ]);
    expect(nativeOptions.watermarks[0].src).toEqual({
      uri: 'file:///tmp/watermark.png',
    });
  });

  it('rejects mark calls without text or image watermarks', () => {
    expect(() =>
      Marker.mark({
        backgroundImage: {
          src: 'file:///tmp/background.png',
        },
      })
    ).toThrow('please set watermark text or image!');
  });
});
