const mockApply = jest.fn();
const mockCreateRecipe = jest.fn(() => ({ apply: mockApply }));
const mockEmbedInvisible = jest.fn();
const mockEmbedInvisibleWithCredentials = jest.fn();
const mockGetImageInfo = jest.fn(() =>
  Promise.resolve({
    width: 1920,
    height: 1080,
    encodedWidth: 1920,
    encodedHeight: 1080,
    format: 'png',
    mimeType: 'image/png',
    orientation: 1,
    rotationDegrees: 0,
    mirrored: false,
    requiresNormalization: false,
  })
);

jest.mock('react-native-image-marker', () => ({
  __esModule: true,
  ImageFormat: {
    jpg: 'jpg',
    png: 'png',
    webp: 'webp',
    base64: 'base64',
  },
  default: {
    createRecipe: mockCreateRecipe,
    embedInvisible: mockEmbedInvisible,
    embedInvisibleWithCredentials: mockEmbedInvisibleWithCredentials,
    getImageInfo: mockGetImageInfo,
  },
}));

const { createCoreEditorAdapter } =
  require('../core-adapter') as typeof import('../core-adapter');

function result(uri: string) {
  return {
    jobId: `job-${uri}`,
    operation: 'mark' as const,
    uri,
    output: 'file' as const,
    format: 'png' as const,
    mimeType: 'image/png' as const,
    durationMs: 1,
    metadata: { orientation: 'normalized' as const, policy: 'strip' as const },
  };
}

const request = {
  recipe: {
    schemaVersion: 2 as const,
    layers: [{ id: 'title', type: 'text' as const, text: 'Hello' }],
    output: { saveFormat: 'png' as const },
  },
  input: { backgroundImage: { src: '/source.png' } },
  control: { timeoutMs: 5000 },
};

describe('Core editor adapter', () => {
  beforeEach(() => {
    mockApply.mockReset();
    mockCreateRecipe.mockClear();
    mockEmbedInvisible.mockReset();
    mockEmbedInvisibleWithCredentials.mockReset();
    mockGetImageInfo.mockClear();
  });

  it('uses a bounded preview recipe without mutating the source recipe', async () => {
    mockApply.mockResolvedValue(result('/preview.png'));
    const adapter = createCoreEditorAdapter(720);

    await expect(adapter.renderPreview(request)).resolves.toEqual(
      result('/preview.png')
    );
    expect(mockCreateRecipe).toHaveBeenCalledWith(
      expect.objectContaining({
        output: { saveFormat: 'png', maxSize: 720 },
      })
    );
    expect(request.recipe.output).toEqual({ saveFormat: 'png' });
    expect(mockApply).toHaveBeenCalledWith(request.input, request.control);
    expect(mockGetImageInfo).toHaveBeenCalledWith('/source.png');
  });

  it('projects source-space geometry into the bounded Core preview', async () => {
    mockApply.mockResolvedValue(result('/preview.png'));
    const adapter = createCoreEditorAdapter(960);
    const sourceRecipe = {
      ...request.recipe,
      layers: [
        {
          id: 'title',
          type: 'text' as const,
          text: 'Hello',
          position: { X: 119, Y: 132 },
          style: { fontSize: 62 },
        },
        {
          id: 'logo',
          type: 'image' as const,
          src: '/logo.png',
          position: { X: 1101, Y: 590 },
          scale: 0.68,
        },
      ],
    };

    await adapter.renderPreview({
      ...request,
      recipe: sourceRecipe,
      sourceSize: { width: 1586, height: 992 },
    });

    const previewRecipe = mockCreateRecipe.mock.calls.at(-1)?.[0];
    expect(previewRecipe.output.maxSize).toBe(960);
    expect(previewRecipe.layers[0].position.X).toBeCloseTo(119 * (960 / 1586));
    expect(previewRecipe.layers[0].style.fontSize).toBeCloseTo(
      62 * (600 / 992)
    );
    expect(previewRecipe.layers[1].position.X).toBeCloseTo(1101 * (960 / 1586));
    expect(previewRecipe.layers[1].position.Y).toBeCloseTo(590 * (600 / 992));
    expect(previewRecipe.layers[1].scale).toBeCloseTo(0.68 * (600 / 992));
    expect(sourceRecipe.layers[1]).toEqual(
      expect.objectContaining({
        position: { X: 1101, Y: 590 },
        scale: 0.68,
      })
    );
    expect(mockGetImageInfo).not.toHaveBeenCalled();
  });

  it('exports visible pixels and optionally adds an invisible locator', async () => {
    mockApply.mockResolvedValue(result('/visible.png'));
    mockEmbedInvisible.mockResolvedValue({
      ...result('/final.png'),
      operation: 'embedInvisible',
    });
    const adapter = createCoreEditorAdapter();

    await expect(
      adapter.exportOriginal({
        ...request,
        options: {
          invisible: {
            payload: 'asset-42',
            key: '0123456789abcdef',
          },
        },
      })
    ).resolves.toEqual({
      visible: result('/visible.png'),
      final: expect.objectContaining({ uri: '/final.png' }),
    });
    expect(mockEmbedInvisible).toHaveBeenCalledWith(
      expect.objectContaining({
        image: { src: '/visible.png' },
        payload: 'asset-42',
        saveFormat: 'png',
      }),
      request.control
    );
  });

  it('keeps Content Credentials opt-in and tied to a locator', async () => {
    mockApply.mockResolvedValue(result('/visible.png'));
    const adapter = createCoreEditorAdapter();
    await expect(
      adapter.exportOriginal({
        ...request,
        options: {
          contentCredentials: {
            adapter: {
              sign: jest.fn(),
              verify: jest.fn(),
            },
            claim: { title: 'Example' },
          },
        },
      })
    ).rejects.toThrow('requires invisible locator options');
  });
});
