function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach((nestedValue) => {
      deepFreeze(nestedValue);
    });
    Object.freeze(value);
  }
  return value;
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
  };
  let resolveAssetSource: jest.Mock;

  beforeEach(() => {
    jest.resetModules();

    const reactNative = require('react-native');
    nativeModule = {
      markWithText: jest.fn(),
      markWithImage: jest.fn(),
      markWithWatermarks: jest.fn(),
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
          positionOptions: {
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

    await expect(Marker.markText(options)).resolves.toBe('/tmp/text.png');

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
      __packager_asset: false,
    });
    expect(nativeOptions.watermarkTexts[0].position).toEqual({
      position: Position.topRight,
      X: 12,
      Y: '5%',
      edgeInset: 0,
    });
    expect(nativeOptions.watermarkTexts[0]).not.toHaveProperty(
      'positionOptions'
    );
    expect(options.backgroundImage.src).toBe('file:///tmp/background.png');
    expect(options.watermarkTexts[0]).toHaveProperty('positionOptions');
    expect(options.watermarkTexts[0]).not.toHaveProperty('position');
    expect(nativeOptions.watermarkTexts[0].position).not.toBe(
      options.watermarkTexts[0].positionOptions
    );
  });

  it('resolves markImage assets and preserves explicit maxSize', async () => {
    nativeModule.markWithImage.mockResolvedValue('/tmp/image.png');
    const options = {
      backgroundImage: {
        src: 10,
        scale: 1,
      },
      watermarkImage: {
        src: 'file:///tmp/legacy-watermark.png',
        scale: 1,
      },
      watermarkPositions: {
        position: Position.center,
        edgeInset: '2%',
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

    await expect(Marker.markImage(options)).resolves.toBe('/tmp/image.png');

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
    expect(nativeOptions.watermarkImage.src).toEqual({
      uri: 'file:///tmp/legacy-watermark.png',
      __packager_asset: false,
    });
    expect(nativeOptions.watermarkImages[0].src).toEqual({
      uri: 'file:///tmp/watermark.png',
      __packager_asset: false,
    });
    expect(nativeOptions.watermarkImages[0]).toEqual(
      expect.objectContaining({
        trimTransparentPadding: true,
      })
    );
    expect(nativeOptions.watermarkImages[0].position).toEqual({
      position: Position.bottomRight,
      X: '10%',
      Y: 20,
      edgeInset: 0,
    });
    expect(nativeOptions.watermarkImages[0].position).not.toBe(
      options.watermarkImages[0].position
    );
    expect(nativeOptions.watermarkPositions).toEqual({
      position: Position.center,
      edgeInset: '2%',
    });
    expect(nativeOptions.watermarkPositions).not.toBe(
      options.watermarkPositions
    );
    expect(options.backgroundImage.src).toBe(10);
    expect(options.watermarkImage.src).toBe('file:///tmp/legacy-watermark.png');
    expect(options.watermarkImages[0].src).toBe('file:///tmp/watermark.png');
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

  it('sends legacy text and image watermarks as ordered native layers', async () => {
    nativeModule.markWithWatermarks.mockResolvedValueOnce('/tmp/final.jpg');
    const options = {
      backgroundImage: {
        src: 'file:///tmp/background.png',
        scale: 0.8,
      },
      watermarkTexts: [
        {
          text: 'Mixed',
          positionOptions: {
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

    await expect(Marker.mark(options)).resolves.toBe('/tmp/final.jpg');

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
      __packager_asset: false,
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
      Y: 24,
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
    expect(options.watermarkTexts[0]).toHaveProperty('positionOptions');
    expect(options.watermarkImages[0].src).toBe(12);
    expect(nativeOptions.watermarks[1].position).toEqual({
      position: Position.topRight,
      X: 20,
      Y: 16,
      edgeInset: 4,
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
    ).resolves.toBe('/tmp/final.png');

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
      __packager_asset: false,
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
