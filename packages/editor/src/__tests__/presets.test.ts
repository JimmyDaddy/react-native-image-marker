import {
  createBrandLogoLayer,
  createBrandTextLayer,
  createEditorBrandKit,
  createEditorTemplate,
  materializeEditorTemplate,
} from '../presets';

describe('editor templates and brand presets', () => {
  it('normalizes a brand kit and creates reusable text and logo layers', () => {
    const kit = createEditorBrandKit({
      colors: ['#FF3366', '#FF3366', '#0F172A'],
      fonts: ['Inter', 'Inter'],
      logos: [{ id: 'logo', name: 'Primary logo', source: '/logo.png' }],
    });
    expect(kit.colors).toEqual(['#FF3366', '#0F172A']);
    expect(kit.fonts).toEqual(['Inter']);
    expect(createBrandTextLayer('Hello', kit)).toEqual(
      expect.objectContaining({
        text: 'Hello',
        style: expect.objectContaining({
          color: '#FF3366',
          fontName: 'Inter',
        }),
      })
    );
    expect(createBrandLogoLayer(kit.logos![0]!)).toEqual(
      expect.objectContaining({
        type: 'image',
        src: '/logo.png',
        name: 'Primary logo',
      })
    );
  });

  it('materializes placeholders and conditional layers through Recipe', () => {
    const template = createEditorTemplate({
      id: 'social-card',
      name: 'Social card',
      recipe: {
        schemaVersion: 2,
        layers: [
          {
            id: 'title',
            type: 'text',
            text: 'Hello {{name}}',
          },
          {
            id: 'sale',
            type: 'text',
            text: 'Sale',
            visibleWhen: { variable: 'showSale', equals: true },
          },
        ],
        output: {},
      },
    });
    const resolved = materializeEditorTemplate(template, {
      variables: { name: 'Ada', showSale: false },
    });
    expect(resolved.layers).toEqual([
      expect.objectContaining({ id: 'title', text: 'Hello Ada' }),
    ]);
  });
});
