const mockApply = jest.fn();
const mockCreateRecipe = jest.fn(() => ({ apply: mockApply }));
const mockEmbedInvisible = jest.fn();
const mockEmbedInvisibleWithCredentials = jest.fn();

jest.mock('react-native-image-marker', () => ({
  __esModule: true,
  default: {
    createRecipe: mockCreateRecipe,
    embedInvisible: mockEmbedInvisible,
    embedInvisibleWithCredentials: mockEmbedInvisibleWithCredentials,
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
