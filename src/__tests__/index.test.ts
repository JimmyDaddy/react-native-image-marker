describe('Marker JS wrapper', () => {
  let Marker: any;
  let ImageFormat: any;
  let Position: any;
  let nativeModule: {
    markWithText: jest.Mock;
    markWithImage: jest.Mock;
  };
  let resolveAssetSource: jest.Mock;

  beforeEach(() => {
    jest.resetModules();

    const reactNative = require('react-native');
    nativeModule = {
      markWithText: jest.fn(),
      markWithImage: jest.fn(),
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
          },
          style: {
            fontSizeRatio: 0.04,
          },
        },
      ],
      quality: 90,
      saveFormat: ImageFormat.png,
    };

    await expect(Marker.markText(options)).resolves.toBe('/tmp/text.png');

    expect(nativeModule.markWithText).toHaveBeenCalledTimes(1);
    expect(nativeModule.markWithText).toHaveBeenCalledWith(
      expect.objectContaining({
        maxSize: 2048,
        quality: 90,
        saveFormat: ImageFormat.png,
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
    });
    expect(nativeOptions.watermarkTexts[0]).not.toHaveProperty(
      'positionOptions'
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
      },
      watermarkImages: [
        {
          src: 'file:///tmp/watermark.png',
          position: {
            position: Position.bottomRight,
            X: '10%',
            Y: 20,
          },
          scale: 0.5,
        },
      ],
      maxSize: 1024,
      saveFormat: ImageFormat.jpg,
    };

    await expect(Marker.markImage(options)).resolves.toBe('/tmp/image.png');

    expect(nativeModule.markWithImage).toHaveBeenCalledTimes(1);
    const nativeOptions = nativeModule.markWithImage.mock.calls[0][0];
    expect(nativeOptions.maxSize).toBe(1024);
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

  it('composes text and image watermarks with a single mark call', async () => {
    nativeModule.markWithText.mockResolvedValueOnce('/tmp/text-step.png');
    nativeModule.markWithImage.mockResolvedValueOnce('/tmp/final.jpg');
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
          },
          scale: 0.5,
        },
      ],
      quality: 82,
      filename: 'mixed-output',
      saveFormat: ImageFormat.jpg,
    };

    await expect(Marker.mark(options)).resolves.toBe('/tmp/final.jpg');

    expect(nativeModule.markWithText).toHaveBeenCalledTimes(1);
    expect(nativeModule.markWithImage).toHaveBeenCalledTimes(1);
    const textOptions = nativeModule.markWithText.mock.calls[0][0];
    const imageOptions = nativeModule.markWithImage.mock.calls[0][0];

    expect(textOptions).toEqual(
      expect.objectContaining({
        quality: 100,
        saveFormat: ImageFormat.png,
        maxSize: 2048,
      })
    );
    expect(textOptions).not.toHaveProperty('filename');
    expect(textOptions.backgroundImage.src).toEqual({
      uri: 'file:///tmp/background.png',
      __packager_asset: false,
    });
    expect(textOptions.watermarkTexts[0].position).toEqual({
      position: Position.bottomCenter,
      Y: 24,
    });

    expect(imageOptions).toEqual(
      expect.objectContaining({
        quality: 82,
        filename: 'mixed-output',
        saveFormat: ImageFormat.jpg,
        maxSize: 2048,
      })
    );
    expect(imageOptions.backgroundImage.src).toEqual({
      uri: '/tmp/text-step.png',
      __packager_asset: false,
    });
    expect(imageOptions.watermarkImages[0].src).toEqual({
      uri: 'asset://12',
      width: 120,
      height: 80,
      scale: 1,
    });
    expect(options.watermarkTexts[0]).toHaveProperty('positionOptions');
    expect(options.watermarkImages[0].src).toBe(12);
  });

  it('supports image-first composition order', async () => {
    nativeModule.markWithImage.mockResolvedValueOnce('/tmp/image-step.png');
    nativeModule.markWithText.mockResolvedValueOnce('/tmp/final.png');

    await expect(
      Marker.mark({
        backgroundImage: {
          src: 'file:///tmp/background.png',
        },
        watermarkOrder: 'image-first',
        watermarkImages: [
          {
            src: 'file:///tmp/watermark.png',
            position: {
              position: Position.topLeft,
            },
          },
        ],
        watermarkTexts: [
          {
            text: 'Final text',
            position: {
              position: Position.bottomRight,
            },
          },
        ],
        saveFormat: ImageFormat.png,
      })
    ).resolves.toBe('/tmp/final.png');

    expect(nativeModule.markWithImage).toHaveBeenCalledTimes(1);
    expect(nativeModule.markWithText).toHaveBeenCalledTimes(1);
    expect(nativeModule.markWithImage.mock.invocationCallOrder[0]).toBeLessThan(
      nativeModule.markWithText.mock.invocationCallOrder[0]
    );
    expect(nativeModule.markWithImage.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        quality: 100,
        saveFormat: ImageFormat.png,
      })
    );
    expect(
      nativeModule.markWithText.mock.calls[0][0].backgroundImage.src
    ).toEqual({
      uri: '/tmp/image-step.png',
      __packager_asset: false,
    });
  });

  it('rejects mark calls without text or image watermarks', async () => {
    await expect(
      Marker.mark({
        backgroundImage: {
          src: 'file:///tmp/background.png',
        },
      })
    ).rejects.toThrow('please set watermark text or image!');
  });
});
