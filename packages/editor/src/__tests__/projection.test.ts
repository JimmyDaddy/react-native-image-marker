import {
  createEditorViewportProjection,
  fitEditorSizeWithinMax,
  projectEditorPoint,
  projectEditorRecipe,
  unprojectEditorPoint,
} from '../projection';

describe('editor projection', () => {
  it('fits a source image within the preview boundary without stretching it', () => {
    expect(fitEditorSizeWithinMax({ width: 1586, height: 992 }, 960)).toEqual({
      width: 960,
      height: 600,
    });
    expect(fitEditorSizeWithinMax({ width: 320, height: 180 }, 960)).toEqual({
      width: 320,
      height: 180,
    });
  });

  it('letterboxes the source and round-trips source coordinates', () => {
    const projection = createEditorViewportProjection(
      { width: 1600, height: 900 },
      { width: 720, height: 450 }
    );

    expect(projection).toEqual({
      source: { width: 1600, height: 900 },
      viewport: { width: 720, height: 450 },
      content: { x: 0, y: 22.5, width: 720, height: 405 },
      scale: 0.45,
    });
    const projected = projectEditorPoint({ x: 1100, y: 590 }, projection);
    expect(projected).toEqual({ x: 495, y: 288 });
    expect(unprojectEditorPoint(projected, projection)).toEqual({
      x: 1100,
      y: 590,
    });
  });

  it('projects numeric Recipe geometry while preserving percentages and source data', () => {
    const recipe = {
      schemaVersion: 2 as const,
      layers: [
        {
          id: 'title',
          type: 'text' as const,
          text: 'IMAGE MARKER 2.0',
          position: { X: 119, Y: '10%' },
          style: {
            fontSize: 62,
            shadowStyle: { dx: 2, dy: 3, radius: 4, color: '#000000' },
            strokeStyle: { width: 2, color: '#FFFFFF' },
            textBackgroundStyle: {
              color: '#000000',
              paddingX: 8,
              paddingY: 6,
            },
          },
        },
        {
          id: 'logo',
          type: 'image' as const,
          src: '/logo.png',
          position: { X: 1101, Y: 590 },
          scale: 0.68,
        },
      ],
      output: { saveFormat: 'png' as const },
    };

    const projected = projectEditorRecipe(
      recipe,
      { width: 1586, height: 992 },
      { width: 960, height: 600 }
    );
    const title = projected.layers[0];
    const logo = projected.layers[1];

    expect(title?.position?.X).toBeCloseTo(119 * (960 / 1586));
    expect(title?.position?.Y).toBe('10%');
    if (title?.type !== 'text') throw new Error('Expected text layer');
    expect(title.style?.fontSize).toBeCloseTo(62 * (600 / 992));
    expect(title.style?.shadowStyle).toEqual({
      dx: expect.closeTo(2 * (960 / 1586)),
      dy: expect.closeTo(3 * (600 / 992)),
      radius: expect.closeTo(4 * (600 / 992)),
      color: '#000000',
    });
    expect(title.style?.textBackgroundStyle?.paddingX).toBeCloseTo(
      8 * (960 / 1586)
    );
    expect(title.style?.textBackgroundStyle?.paddingY).toBeCloseTo(
      6 * (600 / 992)
    );
    expect(logo?.position?.X).toBeCloseTo(1101 * (960 / 1586));
    expect(logo?.position?.Y).toBeCloseTo(590 * (600 / 992));
    if (logo?.type !== 'image') throw new Error('Expected image layer');
    expect(logo.scale).toBeCloseTo(0.68 * (600 / 992));
    expect(recipe.layers[0]?.position).toEqual({ X: 119, Y: '10%' });
    expect(recipe.layers[1]).toEqual(expect.objectContaining({ scale: 0.68 }));
  });

  it('rejects invalid projection sizes', () => {
    expect(() =>
      createEditorViewportProjection(
        { width: 0, height: 100 },
        { width: 100, height: 100 }
      )
    ).toThrow('sourceSize');
    expect(() =>
      fitEditorSizeWithinMax({ width: 100, height: 100 }, 0)
    ).toThrow('maxSize');
  });
});
