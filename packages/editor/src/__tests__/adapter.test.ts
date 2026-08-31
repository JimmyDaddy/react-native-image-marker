jest.mock('react-native-image-marker', () => ({
  __esModule: true,
  ImageFormat: {
    jpg: 'jpg',
    png: 'png',
    webp: 'webp',
    base64: 'base64',
  },
}));

import { createEditorRenderAdapter, type EditorMarkerEngine } from '../adapter';

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

function createEngine(): jest.Mocked<EditorMarkerEngine> {
  return {
    getImageInfo: jest.fn().mockResolvedValue({
      width: 1600,
      height: 900,
      encodedWidth: 1600,
      encodedHeight: 900,
      format: 'png',
      mimeType: 'image/png',
      orientation: 1,
      rotationDegrees: 0,
      mirrored: false,
      requiresNormalization: false,
    }),
    createRecipe: jest.fn(() => ({
      apply: jest.fn().mockResolvedValue(result('/preview.png')),
    })),
    embedInvisible: jest.fn(),
    embedInvisibleWithCredentials: jest.fn(),
  };
}

describe('createEditorRenderAdapter', () => {
  it('uses only the supplied Marker-compatible engine for previews', async () => {
    const engine = createEngine();
    const adapter = createEditorRenderAdapter(engine, 800);
    const request = {
      recipe: {
        schemaVersion: 2 as const,
        layers: [{ id: 'title', type: 'text' as const, text: 'Hello' }],
        output: { saveFormat: 'png' as const },
      },
      input: { backgroundImage: { src: '/source.png' } },
    };

    await expect(adapter.renderPreview(request)).resolves.toEqual(
      result('/preview.png')
    );
    expect(engine.getImageInfo).toHaveBeenCalledWith('/source.png');
    expect(engine.createRecipe).toHaveBeenCalledWith(
      expect.objectContaining({
        output: { saveFormat: 'png', maxSize: 800 },
      })
    );
  });
});
