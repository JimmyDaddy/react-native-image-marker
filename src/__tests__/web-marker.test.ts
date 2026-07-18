import {
  encodeCanvas,
  encodeCanvasToBlob,
  fitSizeWithinMax,
  getExpandedCanvasSize,
  getRotatedBounds,
  resolveAnchoredPosition,
  resolveSpreadValue,
} from '../web';

describe('WebMarker pure helpers', () => {
  it('is safe to import without a browser DOM', () => {
    expect(require('../web').default).toBeDefined();
  });

  it('resolves pixel and percentage spread values', () => {
    expect(resolveSpreadValue(24, 400)).toBe(24);
    expect(resolveSpreadValue('12.5%', 400)).toBe(50);
    expect(resolveSpreadValue(' 18 ', 400)).toBe(18);
    expect(resolveSpreadValue(undefined, 400)).toBeUndefined();
  });

  it('bounds large image dimensions without changing their aspect ratio', () => {
    expect(fitSizeWithinMax({ width: 4000, height: 3000 }, 1000)).toEqual({
      width: 1000,
      height: 750,
    });
    expect(fitSizeWithinMax({ width: 640, height: 480 }, 1000)).toEqual({
      width: 640,
      height: 480,
    });
  });

  it('rejects invalid web image bounds', () => {
    expect(() => fitSizeWithinMax({ width: 640, height: 480 }, 0)).toThrow(
      'maxSize must be a positive finite integer.'
    );
    expect(() => fitSizeWithinMax({ width: 0, height: 480 }, 1000)).toThrow(
      'image dimensions must be finite numbers greater than 0.'
    );
  });

  it('uses the compatibility inset for named anchors', () => {
    expect(
      resolveAnchoredPosition(
        { position: 'bottomRight' as any },
        { width: 800, height: 600 },
        { width: 100, height: 50 }
      )
    ).toEqual({ x: 680, y: 530 });
  });

  it('treats right and bottom offsets as distances from their edges', () => {
    expect(
      resolveAnchoredPosition(
        {
          position: 'bottomRight' as any,
          X: '10%',
          Y: 30,
          edgeInset: 0,
        },
        { width: 800, height: 600 },
        { width: 100, height: 50 }
      )
    ).toEqual({ x: 620, y: 520 });
  });

  it('applies center offsets from the centered origin', () => {
    expect(
      resolveAnchoredPosition(
        { position: 'center' as any, X: 15, Y: '-10%' },
        { width: 400, height: 200 },
        { width: 100, height: 40 }
      )
    ).toEqual({ x: 165, y: 60 });
  });

  it('keeps API-specific defaults for unanchored content', () => {
    expect(
      resolveAnchoredPosition(
        undefined,
        { width: 400, height: 200 },
        { width: 100, height: 40 },
        0
      )
    ).toEqual({ x: 0, y: 0 });
    expect(
      resolveAnchoredPosition(
        { edgeInset: '5%' },
        { width: 400, height: 200 },
        { width: 100, height: 40 },
        0
      )
    ).toEqual({ x: 20, y: 10 });
  });

  it('computes stable rotated bounds and expanded canvas sizes', () => {
    const bounds = getRotatedBounds({ width: 100, height: 50 }, 90);
    expect(bounds.left).toBeCloseTo(-50);
    expect(bounds.top).toBeCloseTo(0);
    expect(bounds.width).toBeCloseTo(50);
    expect(bounds.height).toBeCloseTo(100);
    expect(getExpandedCanvasSize({ width: 100, height: 50 }, 90)).toEqual({
      width: 50,
      height: 100,
    });
  });

  it('serializes jpg quality from the 0-100 API range', () => {
    const canvas = {
      width: 100,
      height: 50,
      toDataURL: jest.fn(() => 'data:image/jpeg;base64,abc'),
    };

    expect(encodeCanvas(canvas, 'jpg', 82)).toBe('data:image/jpeg;base64,abc');
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.82);
  });

  it('serializes base64 mode as a PNG data URL', () => {
    const canvas = {
      width: 100,
      height: 50,
      toDataURL: jest.fn(() => 'data:image/png;base64,abc'),
    };

    expect(encodeCanvas(canvas, 'base64', undefined)).toBe(
      'data:image/png;base64,abc'
    );
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/png', 1);
  });

  it('encodes PNG and JPEG recipes as browser Blobs', async () => {
    const canvas = {
      width: 100,
      height: 50,
      toDataURL: jest.fn(),
      toBlob: jest.fn(
        (
          callback: (blob: Blob | null) => void,
          type = 'image/png',
          _quality?: number
        ) => callback(new Blob(['encoded'], { type }))
      ),
    };

    await expect(encodeCanvasToBlob(canvas, 'png', undefined)).resolves.toEqual(
      expect.objectContaining({ type: 'image/png' })
    );
    expect(canvas.toBlob).toHaveBeenNthCalledWith(
      1,
      expect.any(Function),
      'image/png',
      1
    );

    await expect(encodeCanvasToBlob(canvas, 'jpg', 82)).resolves.toEqual(
      expect.objectContaining({ type: 'image/jpeg' })
    );
    expect(canvas.toBlob).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      'image/jpeg',
      0.82
    );
  });

  it('reports unsupported, failed, and unexpected Blob encoders', async () => {
    const baseCanvas = {
      width: 100,
      height: 50,
      toDataURL: jest.fn(),
    };

    await expect(encodeCanvasToBlob(baseCanvas, 'png', 100)).rejects.toThrow(
      'does not support Canvas toBlob'
    );
    await expect(
      encodeCanvasToBlob(
        {
          ...baseCanvas,
          toBlob: (callback) => callback(null),
        },
        'png',
        100
      )
    ).rejects.toThrow('could not encode');
    await expect(
      encodeCanvasToBlob(
        {
          ...baseCanvas,
          toBlob: (callback) =>
            callback(new Blob(['wrong'], { type: 'image/webp' })),
        },
        'png',
        100
      )
    ).rejects.toThrow('unexpected MIME type: image/webp');
  });

  it('reports tainted Blob exports as a CORS problem', async () => {
    const securityError = Object.assign(new Error('Tainted canvases'), {
      name: 'SecurityError',
    });

    await expect(
      encodeCanvasToBlob(
        {
          width: 100,
          height: 50,
          toDataURL: jest.fn(),
          toBlob: () => {
            throw securityError;
          },
        },
        'png',
        100
      )
    ).rejects.toThrow(/tainted.*CORS|CORS.*tainted/i);
  });

  it('reports tainted canvas exports as a CORS problem', () => {
    const securityError = Object.assign(new Error('Tainted canvases'), {
      name: 'SecurityError',
    });
    const canvas = {
      width: 100,
      height: 50,
      toDataURL: jest.fn(() => {
        throw securityError;
      }),
    };

    expect(() => encodeCanvas(canvas, 'png', 100)).toThrow(
      /tainted.*CORS|CORS.*tainted/i
    );
  });

  it('rejects invalid quality before serialization', () => {
    const canvas = {
      width: 100,
      height: 50,
      toDataURL: jest.fn(() => 'data:image/png;base64,abc'),
    };

    expect(() => encodeCanvas(canvas, 'png', 50.5)).toThrow(
      'quality must be a finite integer between 0 and 100.'
    );
    expect(canvas.toDataURL).not.toHaveBeenCalled();
  });
});
