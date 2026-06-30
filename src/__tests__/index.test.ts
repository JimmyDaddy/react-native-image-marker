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
});
