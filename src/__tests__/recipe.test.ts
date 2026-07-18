import type { MarkOptions } from '../index';
import { createWatermarkRecipe, type WatermarkRecipeOptions } from '../recipe';

describe('watermark recipes', () => {
  it('snapshots nested settings while retaining source references', async () => {
    const logoSource = { uri: 'logo.png' };
    const options: WatermarkRecipeOptions = {
      watermarks: [
        {
          type: 'text',
          text: 'ORIGINAL',
          positionOptions: { X: 12, Y: 18 },
          layout: { type: 'single' },
          style: {
            color: '#FFFFFF',
            strokeStyle: { color: '#000000', width: 2 },
            textBackgroundStyle: {
              color: '#111111',
              cornerRadius: { all: { x: 6, y: 6 } },
            },
          },
        },
        { type: 'image', src: logoSource, layout: { type: 'tile', gapX: 20 } },
      ],
      quality: 90,
    };
    const renderer = jest.fn<Promise<string>, [MarkOptions]>(
      async () => 'done'
    );
    const recipe = createWatermarkRecipe(options, renderer);

    const textLayer = options.watermarks[0];
    const imageLayer = options.watermarks[1];
    if (textLayer?.type === 'text') {
      textLayer.text = 'MUTATED';
      if (textLayer.positionOptions) textLayer.positionOptions.X = 999;
      if (textLayer.style?.strokeStyle) textLayer.style.strokeStyle.width = 9;
      const all = textLayer.style?.textBackgroundStyle?.cornerRadius?.all;
      if (all) all.x = 99;
    }
    if (imageLayer?.type === 'image' && imageLayer.layout) {
      imageLayer.layout.gapX = 999;
    }
    options.quality = 1;

    await expect(
      recipe.apply({
        backgroundImage: { src: 'background.jpg' },
        filename: 'first',
      })
    ).resolves.toBe('done');

    const rendered = renderer.mock.calls[0]?.[0];
    expect(rendered).toEqual(
      expect.objectContaining({
        backgroundImage: { src: 'background.jpg' },
        filename: 'first',
        quality: 90,
      })
    );
    expect(rendered?.watermarks?.[0]).toEqual(
      expect.objectContaining({
        text: 'ORIGINAL',
        positionOptions: { X: 12, Y: 18 },
        style: expect.objectContaining({
          strokeStyle: { color: '#000000', width: 2 },
          textBackgroundStyle: expect.objectContaining({
            cornerRadius: { all: { x: 6, y: 6 } },
          }),
        }),
      })
    );
    expect(rendered?.watermarks?.[1]).toEqual(
      expect.objectContaining({ layout: { type: 'tile', gapX: 20 } })
    );
    expect(
      rendered?.watermarks?.[1]?.type === 'image'
        ? rendered.watermarks[1].src
        : undefined
    ).toBe(logoSource);
  });

  it('snapshots each input wrapper before rendering', async () => {
    const recipe = createWatermarkRecipe(
      { watermarks: [{ type: 'text', text: 'Reusable' }] },
      async (options) => String(options.backgroundImage.src)
    );
    const input = {
      backgroundImage: { src: 'before.jpg', alpha: 0.5 },
      filename: 'before',
    };

    const output = recipe.apply(input);
    input.backgroundImage.src = 'after.jpg';
    input.filename = 'after';

    await expect(output).resolves.toBe('before.jpg');
  });

  it('validates modern ordered layers and each apply input', async () => {
    expect(() =>
      createWatermarkRecipe({ watermarks: [] }, async () => 'done')
    ).toThrow('createRecipe requires at least one watermark layer.');
    expect(() =>
      createWatermarkRecipe(
        {
          watermarks: [{ type: 'image', src: '' }],
        },
        async () => 'done'
      )
    ).toThrow('please set mark image!');
    expect(() =>
      createWatermarkRecipe(
        {
          watermarks: [{ type: 'text', text: 'Modern' }],
          watermarkTexts: [{ text: 'Legacy' }],
        } as unknown as WatermarkRecipeOptions,
        async () => 'done'
      )
    ).toThrow(
      'createRecipe does not accept "watermarkTexts"; use ordered watermarks and pass per-image fields to apply().'
    );

    const recipe = createWatermarkRecipe(
      { watermarks: [{ type: 'text', text: 'Reusable' }] },
      async () => 'done'
    );
    await expect(
      recipe.apply({ backgroundImage: { src: '' } })
    ).rejects.toThrow('please set image!');
  });
});
