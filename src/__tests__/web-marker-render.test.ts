import WebMarker from '../web';
import { ImageFormat, Position } from '../index';
import { loadWebImage } from '../web/browser';

class FakeImage {
  static instances: FakeImage[] = [];

  complete = true;
  crossOrigin: string | null = null;
  crossOriginWhenSrcWasSet: string | null = null;
  naturalHeight = 200;
  naturalWidth = 320;
  onerror: ((event?: unknown) => void) | null = null;
  onload: (() => void) | null = null;
  private value = '';

  constructor() {
    FakeImage.instances.push(this);
  }

  get src() {
    return this.value;
  }

  set src(value: string) {
    this.crossOriginWhenSrcWasSet = this.crossOrigin;
    this.value = value;
    queueMicrotask(() => this.onload?.());
  }

  async decode() {}
}

function createFakeCanvas() {
  const canvas = {
    width: 0,
    height: 0,
    toDataURL: jest.fn((type = 'image/png') => `data:${type};base64,rendered`),
    toBlob: jest.fn(
      (callback: (blob: Blob | null) => void, type = 'image/png') =>
        callback(new Blob(['rendered'], { type }))
    ),
    getContext: jest.fn(),
  };
  const context = {
    canvas,
    globalAlpha: 1,
    fillStyle: '#000000',
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    shadowBlur: 0,
    shadowColor: 'transparent',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    imageSmoothingEnabled: true,
    lineJoin: 'miter',
    lineWidth: 1,
    strokeStyle: '#000000',
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    closePath: jest.fn(),
    clip: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    rect: jest.fn(),
    fill: jest.fn(),
    fillRect: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    transform: jest.fn(),
    drawImage: jest.fn(),
    fillText: jest.fn(),
    strokeText: jest.fn(),
    stroke: jest.fn(),
    measureText: jest.fn((text: string) => ({
      width: text.length * 10,
      actualBoundingBoxAscent: 12,
      actualBoundingBoxDescent: 4,
    })),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(320 * 200 * 4).fill(255),
    })),
  };
  canvas.getContext.mockReturnValue(context);
  return { canvas, context };
}

function installFakeBrowserRuntime() {
  const canvases: ReturnType<typeof createFakeCanvas>[] = [];
  FakeImage.instances = [];
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement(name: string) {
        if (name !== 'canvas') {
          throw new Error(`Unexpected element: ${name}`);
        }
        const entry = createFakeCanvas();
        canvases.push(entry);
        return entry.canvas;
      },
    },
  });
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: FakeImage,
  });
  return canvases;
}

describe('WebMarker browser render integration', () => {
  const originalDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    'document'
  );
  const originalImage = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  const originalURL = Object.getOwnPropertyDescriptor(globalThis, 'URL');

  afterEach(() => {
    if (originalDocument) {
      Object.defineProperty(globalThis, 'document', originalDocument);
    } else {
      delete (globalThis as { document?: unknown }).document;
    }
    if (originalImage) {
      Object.defineProperty(globalThis, 'Image', originalImage);
    } else {
      delete (globalThis as { Image?: unknown }).Image;
    }
    if (originalURL) {
      Object.defineProperty(globalThis, 'URL', originalURL);
    } else {
      delete (globalThis as { URL?: unknown }).URL;
    }
  });

  it('runs the public mixed-layer API through the Canvas renderer', async () => {
    const canvases = installFakeBrowserRuntime();

    await expect(
      WebMarker.mark({
        backgroundImage: { src: '/background.jpg' },
        watermarks: [
          {
            type: 'image',
            src: '/logo.png',
            position: { position: Position.topRight, X: 12, Y: 12 },
            scale: 0.25,
          },
          {
            type: 'text',
            text: 'Web SDK',
            position: { position: Position.bottomLeft, X: 16, Y: 16 },
            style: { color: '#FFFFFF', fontSize: 24 },
          },
        ],
        saveFormat: ImageFormat.png,
      })
    ).resolves.toBe('data:image/png;base64,rendered');

    expect(canvases).toHaveLength(1);
    expect(canvases[0]?.canvas.toDataURL).toHaveBeenCalledWith('image/png', 1);
    expect(canvases[0]?.context.drawImage).toHaveBeenCalledTimes(2);
    expect(canvases[0]?.context.fillText).toHaveBeenCalledWith(
      'Web SDK',
      expect.any(Number),
      expect.any(Number)
    );
  });

  it('wraps long text and splits words that exceed the canvas width', async () => {
    const canvases = installFakeBrowserRuntime();
    const longWord = 'x'.repeat(65);

    await WebMarker.markText({
      backgroundImage: { src: '/background.jpg' },
      watermarkTexts: [
        {
          text: `short words before ${longWord}`,
          position: { position: Position.topRight, X: 0, Y: 0 },
        },
      ],
      saveFormat: ImageFormat.png,
    });

    const calls = canvases[0]?.context.fillText.mock.calls ?? [];
    expect(calls).toHaveLength(4);
    expect(calls.map(([line]) => line)).toEqual([
      'short words before',
      'x'.repeat(32),
      'x'.repeat(32),
      'x',
    ]);
    expect(calls.every(([, x]) => Number(x) >= 0)).toBe(true);
  });

  it('renders styled text backgrounds, decorations, alignment, and shadows', async () => {
    const canvases = installFakeBrowserRuntime();

    await WebMarker.markText({
      backgroundImage: { src: '/background.jpg', rotate: 8, alpha: 0.8 },
      watermarkTexts: [
        {
          text: 'Styled\nwatermark',
          position: { position: Position.center, X: 5, Y: -3 },
          style: {
            color: '#F8FAFC',
            fontName: 'Marker "Display"',
            fontSizeRatio: 0.08,
            italic: true,
            bold: true,
            textAlign: 'right',
            rotate: -12,
            skewX: 0.15,
            underline: true,
            strikeThrough: true,
            shadowStyle: {
              color: '#111827AA',
              dx: 2,
              dy: 3,
              radius: 4,
            },
            textBackgroundStyle: {
              type: 'stretchX' as any,
              color: '#0F172ACC',
              padding: '4 8 6 10',
              paddingX: '2%',
              paddingTop: 5,
              cornerRadius: {
                all: { x: '20%', y: 8 },
                topRight: { x: 4, y: 5 },
              },
            },
          },
        },
      ],
      saveFormat: ImageFormat.jpg,
      matteColor: '#abc8',
      quality: 74,
    });

    const { context, canvas } = canvases[0]!;
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.74);
    expect(context.fillRect).toHaveBeenCalled();
    expect(context.quadraticCurveTo).toHaveBeenCalledTimes(4);
    expect(context.fill).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalledTimes(2);
    expect(context.transform).toHaveBeenCalledWith(1, 0, 0.15, 1, 0, 0);
    expect(context.textAlign).toBe('right');
    expect(context.font).toContain('italic 700');
    expect(context.shadowBlur).toBe(4);
  });

  it('draws a text outline before the fill and includes it in anchoring', async () => {
    const canvases = installFakeBrowserRuntime();

    await WebMarker.markText({
      backgroundImage: { src: '/background.jpg' },
      watermarkTexts: [
        {
          text: 'Outline',
          position: { position: Position.topLeft, X: 0, Y: 0 },
          style: {
            color: '#FFFFFF',
            strokeStyle: { color: '#111827', width: 6 },
            textBackgroundStyle: { color: '#F97316' },
          },
        },
      ],
      saveFormat: ImageFormat.png,
    });

    const { context } = canvases[0]!;
    expect(context.strokeStyle).toBe('#111827');
    expect(context.lineWidth).toBe(6);
    expect(context.lineJoin).toBe('round');
    expect(context.strokeText).toHaveBeenCalledWith('Outline', 3, 3);
    expect(context.fillText).toHaveBeenCalledWith('Outline', 3, 3);
    expect(context.strokeText.mock.invocationCallOrder[0]).toBeLessThan(
      context.fillText.mock.invocationCallOrder[0]
    );
    expect(context.moveTo).toHaveBeenCalledWith(0, 0);
  });

  it('tiles outlined text using percentage gaps and staggered rows', async () => {
    const canvases = installFakeBrowserRuntime();

    await WebMarker.markText({
      backgroundImage: { src: '/background.jpg' },
      watermarkTexts: [
        {
          text: 'Tile',
          layout: {
            type: 'tile',
            gapX: 40,
            gapY: 24,
            stagger: true,
          },
          style: {
            rotate: -20,
            strokeStyle: { color: '#111827', width: 2 },
          },
        },
      ],
      saveFormat: ImageFormat.png,
    });

    const { context } = canvases[0]!;
    expect(context.fillText.mock.calls.length).toBeGreaterThan(10);
    expect(context.strokeText).toHaveBeenCalledTimes(
      context.fillText.mock.calls.length
    );
    expect(context.rotate).toHaveBeenCalledWith(expect.any(Number));
    const xValues = context.fillText.mock.calls.map(([, x]) => x);
    expect(new Set(xValues).size).toBeGreaterThan(4);
  });

  it('decodes a tiled image layer once and repeats it before the next layer', async () => {
    const canvases = installFakeBrowserRuntime();

    await WebMarker.mark({
      backgroundImage: { src: '/background.jpg' },
      watermarks: [
        {
          type: 'image',
          src: '/logo.png',
          scale: 0.1,
          layout: { type: 'tile', gapX: 32, gapY: 20 },
        },
        {
          type: 'text',
          text: 'Top layer',
          layout: { type: 'tile', gapX: 80, gapY: 40 },
        },
      ],
      saveFormat: ImageFormat.png,
    });

    expect(FakeImage.instances).toHaveLength(2);
    const { context } = canvases[0]!;
    expect(context.drawImage).toHaveBeenCalledTimes(26);
    expect(context.drawImage.mock.invocationCallOrder.at(-1)).toBeLessThan(
      context.fillText.mock.invocationCallOrder[0]!
    );
  });

  it('fails before drawing a tile layer that exceeds the copy limit', async () => {
    const canvases = installFakeBrowserRuntime();

    await expect(
      WebMarker.markText({
        backgroundImage: { src: '/background.jpg', scale: 10 },
        watermarkTexts: [
          {
            text: 'x',
            layout: { type: 'tile' },
            style: { fontSize: 1 },
          },
        ],
        saveFormat: ImageFormat.png,
      })
    ).rejects.toThrow(
      'tile layout exceeds the maximum of 4096 copies per layer.'
    );

    expect(canvases[0]?.context.fillText).not.toHaveBeenCalled();
  });

  it('bounds large inputs before applying background and watermark scales', async () => {
    const canvases = installFakeBrowserRuntime();

    await WebMarker.markImage({
      backgroundImage: { src: '/background.jpg', scale: 1.5 },
      watermarkImages: [
        {
          src: '/logo.png',
          scale: 0.5,
          trimTransparentPadding: true,
        },
      ],
      maxSize: 100,
      rotationCanvasMode: 'crop' as any,
      saveFormat: ImageFormat.png,
    });

    expect(canvases[0]?.canvas).toMatchObject({ width: 150, height: 95 });
    expect(canvases[0]?.context.drawImage).toHaveBeenNthCalledWith(
      1,
      expect.any(FakeImage),
      0,
      0,
      150,
      95
    );
    expect(canvases[1]?.context.getImageData).toHaveBeenCalledWith(
      0,
      0,
      320,
      200
    );
    expect(canvases[0]?.context.scale).toHaveBeenCalledWith(0.15625, 0.15625);
  });

  it('loads Blob/File-compatible sources and revokes their object URL', async () => {
    installFakeBrowserRuntime();
    const createObjectURL = jest.fn(() => 'blob:image-marker-test');
    const revokeObjectURL = jest.fn();
    Object.defineProperty(globalThis, 'URL', {
      configurable: true,
      value: { createObjectURL, revokeObjectURL },
    });
    const source = {
      arrayBuffer: async () => new ArrayBuffer(0),
      size: 10,
      type: 'image/png',
    };

    const loaded = await loadWebImage(source);

    expect(createObjectURL).toHaveBeenCalledWith(source);
    expect(loaded).toMatchObject({ width: 320, height: 200 });
    loaded.cleanup();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image-marker-test');
  });

  it('explains numeric and unsupported browser image sources', async () => {
    installFakeBrowserRuntime();

    await expect(loadWebImage(42)).rejects.toThrow(
      'Numeric React Native asset IDs are not available on web.'
    );
    await expect(loadWebImage({ nope: true })).rejects.toThrow(
      'Unsupported web image source.'
    );
  });

  it('uses skewX directly as the Canvas shear factor', async () => {
    const canvases = installFakeBrowserRuntime();

    await WebMarker.markText({
      backgroundImage: { src: '/background.jpg' },
      watermarkTexts: [{ text: 'Skew', style: { skewX: -0.25 } }],
      saveFormat: ImageFormat.png,
    });

    expect(canvases[0]?.context.transform).toHaveBeenCalledWith(
      1,
      0,
      -0.25,
      1,
      0,
      0
    );
  });

  it('normalizes translucent matte colors to opaque RGB', async () => {
    const canvases = installFakeBrowserRuntime();

    await WebMarker.markImage({
      backgroundImage: { src: '/background.jpg' },
      watermarkImages: [{ src: '/logo.png' }],
      saveFormat: ImageFormat.jpg,
      matteColor: '#FF000080',
    });

    expect(canvases[0]?.context.fillStyle).toBe('#FF0000');
  });

  it('rejects matte colors outside the native hex subset', async () => {
    await expect(
      WebMarker.markText({
        backgroundImage: { src: '/background.jpg' },
        watermarkTexts: [{ text: 'Invalid matte' }],
        saveFormat: ImageFormat.png,
        matteColor: 'red',
      })
    ).rejects.toThrow(
      'matteColor must use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA.'
    );
  });

  it('enables anonymous CORS before assigning protocol-relative URLs', async () => {
    installFakeBrowserRuntime();

    await loadWebImage('//cdn.example.com/logo.png');

    expect(FakeImage.instances[0]?.crossOrigin).toBe('anonymous');
    expect(FakeImage.instances[0]?.crossOriginWhenSrcWasSet).toBe('anonymous');
  });
});
