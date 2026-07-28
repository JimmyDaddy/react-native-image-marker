import type { MarkOptions } from '../index';
import {
  createWatermarkRecipe,
  importWatermarkRecipe,
  migrateWatermarkRecipe,
  WATERMARK_RECIPE_SCHEMA_VERSION,
  type LegacyWatermarkRecipeDefinition,
  type WatermarkRecipeOptions,
} from '../recipe';

describe('watermark recipes', () => {
  it('snapshots nested settings while retaining runtime source references', async () => {
    const logoSource = { uri: 'logo.png' };
    const options: WatermarkRecipeOptions = {
      layers: [
        {
          id: 'title',
          name: 'Title',
          type: 'text',
          text: 'ORIGINAL',
          position: { X: 12, Y: 18 },
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
        {
          id: 'logo',
          type: 'image',
          src: logoSource,
          layout: { type: 'tile', gapX: 20 },
        },
      ],
      output: { quality: 90 },
    };
    const renderer = jest.fn<Promise<string>, [MarkOptions]>(
      async () => 'done'
    );
    const recipe = createWatermarkRecipe(options, renderer);

    const textLayer = options.layers[0];
    const imageLayer = options.layers[1];
    if (textLayer?.type === 'text') {
      textLayer.text = 'MUTATED';
      if (textLayer.position) textLayer.position.X = 999;
      if (textLayer.style?.strokeStyle) textLayer.style.strokeStyle.width = 9;
      const all = textLayer.style?.textBackgroundStyle?.cornerRadius?.all;
      if (all) all.x = 99;
    }
    if (imageLayer?.type === 'image' && imageLayer.layout) {
      imageLayer.layout.gapX = 999;
    }
    if (options.output) options.output.quality = 1;

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
        position: { X: 12, Y: 18 },
        style: expect.objectContaining({
          strokeStyle: { color: '#000000', width: 2 },
          textBackgroundStyle: expect.objectContaining({
            cornerRadius: { all: { x: 6, y: 6 } },
          }),
        }),
      })
    );
    expect(rendered?.watermarks?.[0]).not.toHaveProperty('id');
    expect(rendered?.watermarks?.[0]).not.toHaveProperty('name');
    expect(
      rendered?.watermarks?.[1]?.type === 'image'
        ? rendered.watermarks[1].src
        : undefined
    ).toBe(logoSource);
  });

  it('snapshots each input wrapper before rendering', async () => {
    const recipe = createWatermarkRecipe(
      { layers: [{ type: 'text', text: 'Reusable' }] },
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

  it('validates Recipe v2 shape, layer IDs, and each apply input', async () => {
    expect(() =>
      createWatermarkRecipe({ layers: [] }, async () => 'done')
    ).toThrow('createRecipe requires at least one layer.');
    expect(() =>
      createWatermarkRecipe(
        { layers: [{ type: 'image', src: '' }] },
        async () => 'done'
      )
    ).toThrow('layers[0].src is required.');
    expect(() =>
      createWatermarkRecipe(
        {
          layers: [
            { id: 'same', type: 'text', text: 'A' },
            { id: 'same', type: 'text', text: 'B' },
          ],
        },
        async () => 'done'
      )
    ).toThrow('Duplicate layer id "same".');
    expect(() =>
      createWatermarkRecipe(
        {
          layers: [{ type: 'text', text: 'Modern' }],
          saveFormat: 'png',
        } as unknown as WatermarkRecipeOptions,
        async () => 'done'
      )
    ).toThrow('createRecipe does not accept "saveFormat" in Recipe v2');

    const recipe = createWatermarkRecipe(
      { layers: [{ type: 'text', text: 'Reusable' }] },
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
        layers: [
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

  it('uses strict conditions and strips editor-only fields before rendering', async () => {
    const renderer = jest.fn<Promise<string>, [MarkOptions]>(
      async () => 'done'
    );
    const recipe = createWatermarkRecipe(
      {
        layers: [
          {
            id: 'visible',
            name: 'Visible',
            locked: true,
            type: 'text',
            text: 'VISIBLE',
            visibleWhen: { variable: 'approved', equals: true },
          },
          {
            id: 'hidden-by-condition',
            type: 'text',
            text: 'STRICTLY HIDDEN',
            visibleWhen: { variable: 'level', equals: 1 },
          },
          {
            id: 'hidden',
            visible: false,
            type: 'text',
            text: 'HIDDEN',
          },
          { id: 'always', type: 'text', text: 'ALWAYS' },
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

  it('serializes Recipe v2 and explicitly migrates persisted Recipe v1', async () => {
    const source = { uri: 'logo.png', headers: { Authorization: 'token' } };
    const recipe = createWatermarkRecipe(
      {
        layers: [
          { type: 'image', src: source },
          { id: 'label', type: 'text', text: '{{label}}' },
        ],
        output: { quality: 88, saveFormat: 'png' },
      },
      async (options) => options.watermarks?.[1]?.text ?? ''
    );
    const definition = recipe.toJSON();

    expect(definition).toEqual(
      expect.objectContaining({
        schemaVersion: 2,
        output: { quality: 88, saveFormat: 'png' },
      })
    );
    expect(definition.layers.map((layer) => layer.id)).toEqual([
      'layer-1',
      'label',
    ]);
    const imageLayer = definition.layers[0];
    if (imageLayer?.type === 'image') {
      imageLayer.src.headers.Authorization = 'changed';
    }
    expect(source.headers.Authorization).toBe('token');

    const legacy: LegacyWatermarkRecipeDefinition = {
      schemaVersion: 1,
      watermarks: [
        { type: 'image', src: '/logo.png' },
        { type: 'text', text: '{{label}}' },
      ],
      quality: 84,
      saveFormat: 'jpg',
    };
    expect(migrateWatermarkRecipe(legacy)).toEqual(
      expect.objectContaining({
        schemaVersion: 2,
        output: expect.objectContaining({ quality: 84, saveFormat: 'jpg' }),
        layers: [
          expect.objectContaining({ id: 'layer-1', type: 'image' }),
          expect.objectContaining({ id: 'layer-2', type: 'text' }),
        ],
      })
    );
    const restored = importWatermarkRecipe(
      JSON.parse(JSON.stringify(legacy)) as LegacyWatermarkRecipeDefinition,
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
          schemaVersion: 1,
          layers: [{ type: 'text', text: 'test' }],
        } as unknown as WatermarkRecipeOptions,
        async () => 'done'
      )
    ).toThrow('Unsupported recipe schemaVersion: 1.');
    expect(() =>
      createWatermarkRecipe(
        { layers: [{ type: 'text', text: '{{not valid}}' }] },
        async () => 'done'
      )
    ).toThrow('layers[0].text contains an invalid variable template');
    expect(() =>
      createWatermarkRecipe(
        {
          layers: [
            {
              type: 'text',
              text: 'test',
              visibleWhen: { variable: '1invalid', equals: true },
            },
          ],
        },
        async () => 'done'
      )
    ).toThrow('layers[0].visibleWhen.variable');

    const recipe = createWatermarkRecipe(
      { layers: [{ type: 'text', text: '{{name}}' }] },
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
      { layers: [{ type: 'text', text: '{{name}} #{{index}}' }] },
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
