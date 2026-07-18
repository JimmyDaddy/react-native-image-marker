import type { MarkOptions } from '../index';
import {
  createWatermarkRecipe,
  WATERMARK_RECIPE_SCHEMA_VERSION,
  type WatermarkRecipeOptions,
} from '../recipe';

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

  it('resolves typed variables, built-ins, repeated values, and escapes', async () => {
    const renderer = jest.fn<Promise<string>, [MarkOptions]>(
      async (options) => options.watermarks?.[0]?.text ?? ''
    );
    const recipe = createWatermarkRecipe(
      {
        watermarks: [
          {
            type: 'text',
            text: '{{name}} · {{count}} · {{enabled}} · {{name}} · \\{{literal}} · #{{index}} · {{filename}}',
          },
        ],
      },
      renderer
    );

    expect(recipe.schemaVersion).toBe(WATERMARK_RECIPE_SCHEMA_VERSION);
    await expect(
      recipe.apply({
        backgroundImage: { src: 'background.jpg' },
        filename: 'photo',
        variables: { name: 'Ada', count: 3, enabled: true },
      })
    ).resolves.toBe('Ada · 3 · true · Ada · {{literal}} · #0 · photo');
  });

  it('uses strict conditions and removes recipe-only fields before rendering', async () => {
    const renderer = jest.fn<Promise<string>, [MarkOptions]>(
      async () => 'done'
    );
    const recipe = createWatermarkRecipe(
      {
        watermarks: [
          {
            type: 'text',
            text: 'VISIBLE',
            visibleWhen: { variable: 'approved', equals: true },
          },
          {
            type: 'text',
            text: 'STRICTLY HIDDEN',
            visibleWhen: { variable: 'level', equals: 1 },
          },
          { type: 'text', text: 'ALWAYS' },
        ],
      },
      renderer
    );

    await recipe.apply({
      backgroundImage: { src: 'background.jpg' },
      variables: { approved: true, level: '1' },
    });

    expect(renderer.mock.calls[0]?.[0].watermarks).toEqual([
      { type: 'text', text: 'VISIBLE' },
      { type: 'text', text: 'ALWAYS' },
    ]);
  });

  it('serializes a detached versioned definition and supports JSON round-trip', async () => {
    const source = { uri: 'logo.png', headers: { Authorization: 'token' } };
    const recipe = createWatermarkRecipe(
      {
        watermarks: [
          { type: 'image', src: source },
          { type: 'text', text: '{{label}}' },
        ],
        quality: 88,
      },
      async (options) => options.watermarks?.[1]?.text ?? ''
    );
    const definition = recipe.toJSON();

    expect(definition.schemaVersion).toBe(1);
    const imageLayer = definition.watermarks[0];
    if (imageLayer?.type === 'image') {
      imageLayer.src.headers.Authorization = 'changed';
    }
    expect(source.headers.Authorization).toBe('token');

    const restored = createWatermarkRecipe(
      JSON.parse(JSON.stringify(recipe)) as WatermarkRecipeOptions,
      async (options) => options.watermarks?.[1]?.text ?? ''
    );
    await expect(
      restored.apply({
        backgroundImage: { src: 'background.jpg' },
        variables: { label: 'ROUND TRIP' },
      })
    ).resolves.toBe('ROUND TRIP');
  });

  it('rejects invalid schemas, templates, conditions, and variable values', async () => {
    expect(() =>
      createWatermarkRecipe(
        {
          schemaVersion: 2,
          watermarks: [{ type: 'text', text: 'test' }],
        } as unknown as WatermarkRecipeOptions,
        async () => 'done'
      )
    ).toThrow('Unsupported recipe schemaVersion: 2.');
    expect(() =>
      createWatermarkRecipe(
        { watermarks: [{ type: 'text', text: '{{not valid}}' }] },
        async () => 'done'
      )
    ).toThrow('watermarks[0].text contains an invalid variable template');
    expect(() =>
      createWatermarkRecipe(
        {
          watermarks: [
            {
              type: 'text',
              text: 'test',
              visibleWhen: { variable: '1invalid', equals: true },
            },
          ],
        },
        async () => 'done'
      )
    ).toThrow('watermarks[0].visibleWhen.variable');

    const recipe = createWatermarkRecipe(
      { watermarks: [{ type: 'text', text: '{{name}}' }] },
      async () => 'done'
    );
    await expect(
      recipe.apply({ backgroundImage: { src: 'background.jpg' } })
    ).rejects.toThrow('Missing recipe variable "name".');
    await expect(
      recipe.apply({
        backgroundImage: { src: 'background.jpg' },
        variables: { index: 4 },
      })
    ).rejects.toThrow('Recipe variable "index" is reserved.');
    await expect(
      recipe.apply({
        backgroundImage: { src: 'background.jpg' },
        variables: { value: Number.POSITIVE_INFINITY, name: 'test' },
      })
    ).rejects.toThrow(
      'variables.value must be a string, finite number, or boolean.'
    );
  });

  it('isolates template failures and resolves zero-based batch indexes', async () => {
    const recipe = createWatermarkRecipe(
      { watermarks: [{ type: 'text', text: '{{name}} #{{index}}' }] },
      async (options) => options.watermarks?.[0]?.text ?? ''
    );

    const results = await recipe.applyMany(
      [
        {
          backgroundImage: { src: 'first.jpg' },
          variables: { name: 'FIRST' },
        },
        { backgroundImage: { src: 'missing.jpg' } },
        {
          backgroundImage: { src: 'third.jpg' },
          variables: { name: 'THIRD' },
        },
      ],
      { concurrency: 3 }
    );

    expect(results[0]).toEqual({ status: 'fulfilled', value: 'FIRST #0' });
    expect(results[1]).toEqual({
      status: 'rejected',
      reason: expect.objectContaining({
        message: 'Missing recipe variable "name".',
      }),
    });
    expect(results[2]).toEqual({ status: 'fulfilled', value: 'THIRD #2' });
  });
});
