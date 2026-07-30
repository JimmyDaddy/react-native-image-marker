import fs from 'node:fs';
import path from 'node:path';

import Ajv2020 from 'ajv/dist/2020';

import {
  addWatermarkRecipeLayer,
  createWatermarkRecipeDefinition,
  duplicateWatermarkRecipeLayer,
  groupWatermarkRecipeLayers,
  materializeWatermarkRecipe,
  migrateWatermarkRecipe,
  parseWatermarkRecipe,
  removeWatermarkRecipeLayer,
  reorderWatermarkRecipeLayer,
  safeValidateWatermarkRecipe,
  serializeWatermarkRecipe,
  ungroupWatermarkRecipeLayers,
  updateWatermarkRecipeLayer,
  validateWatermarkRecipe,
  WatermarkRecipeValidationError,
} from '..';

const recipe = createWatermarkRecipeDefinition({
  layers: [
    {
      id: 'title',
      type: 'text',
      text: '{{name}} #{{index}}',
      position: { position: 'center' },
      style: { fontSize: 32 },
    },
    {
      id: 'logo',
      type: 'image',
      src: 'logo.png',
      scale: 0.25,
    },
  ],
  output: { saveFormat: 'png', quality: 90 },
});

describe('@image-marker/recipe', () => {
  it('creates detached v2 definitions and assigns stable IDs', () => {
    const definition = createWatermarkRecipeDefinition({
      layers: [{ type: 'text', text: 'Draft' }],
    });
    expect(definition).toEqual({
      schemaVersion: 2,
      layers: [{ id: 'layer-1', type: 'text', text: 'Draft' }],
      output: {},
    });
  });

  it('strictly validates serialized v2 documents with path-aware errors', () => {
    expect(validateWatermarkRecipe(recipe)).toEqual(recipe);
    expect(() =>
      validateWatermarkRecipe({
        schemaVersion: 2,
        layers: [{ type: 'text', text: 'Draft' }],
        output: {},
      })
    ).toThrow(WatermarkRecipeValidationError);
    expect(
      safeValidateWatermarkRecipe({
        schemaVersion: 2,
        layers: [{ id: 'bad id', type: 'text', text: 'Draft' }],
        output: {},
      })
    ).toMatchObject({
      success: false,
      error: { path: 'layers[0].id' },
    });
  });

  it('migrates legacy documents and preserves output options', () => {
    expect(
      migrateWatermarkRecipe({
        schemaVersion: 1,
        watermarks: [{ type: 'text', text: 'Legacy' }],
        saveFormat: 'jpg',
        maxSize: 1024,
      })
    ).toEqual({
      schemaVersion: 2,
      layers: [{ id: 'layer-1', type: 'text', text: 'Legacy' }],
      output: { saveFormat: 'jpg', maxSize: 1024 },
    });
  });

  it('materializes templates and conditional layers without mutating input', () => {
    const conditional = updateWatermarkRecipeLayer(recipe, 'logo', {
      visibleWhen: { variable: 'includeLogo', equals: true },
    });
    const materialized = materializeWatermarkRecipe(conditional, {
      index: 4,
      variables: { name: 'Alice', includeLogo: false },
    });
    expect(materialized.layers).toHaveLength(1);
    expect(materialized.layers[0]).toMatchObject({
      id: 'title',
      text: 'Alice #4',
    });
    expect(conditional.layers[0]).toMatchObject({
      text: '{{name}} #{{index}}',
    });
  });

  it('supports immutable add, update, duplicate, reorder, group, and remove operations', () => {
    const added = addWatermarkRecipeLayer(recipe, {
      id: 'caption',
      type: 'text',
      text: 'Caption',
    });
    const updated = updateWatermarkRecipeLayer(added, 'caption', {
      name: 'Caption layer',
    });
    const duplicated = duplicateWatermarkRecipeLayer(updated, 'caption');
    const reordered = reorderWatermarkRecipeLayer(
      duplicated,
      'caption-copy',
      0
    );
    const grouped = groupWatermarkRecipeLayers(
      reordered,
      ['caption', 'caption-copy'],
      'captions'
    );
    const ungrouped = ungroupWatermarkRecipeLayers(grouped, 'captions');
    const removed = removeWatermarkRecipeLayer(ungrouped, 'caption-copy');

    expect(added.layers).toHaveLength(3);
    expect(updated.layers.find((layer) => layer.id === 'caption')?.name).toBe(
      'Caption layer'
    );
    expect(reordered.layers[0]?.id).toBe('caption-copy');
    expect(
      grouped.layers
        .filter((layer) => layer.id.startsWith('caption'))
        .every((layer) => layer.groupId === 'captions')
    ).toBe(true);
    expect(removed.layers.some((layer) => layer.id === 'caption-copy')).toBe(
      false
    );
    expect(recipe.layers).toHaveLength(2);
  });

  it('parses and serializes canonical recipe JSON', () => {
    const serialized = serializeWatermarkRecipe(recipe);
    expect(parseWatermarkRecipe(serialized)).toEqual(recipe);
    expect(() => parseWatermarkRecipe('{bad')).toThrow(
      'Recipe JSON is invalid'
    );
  });

  it('ships a draft 2020-12 JSON Schema for Recipe v2', () => {
    const schema = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../recipe.schema.json'), 'utf8')
    );
    expect(schema).toMatchObject({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      properties: { schemaVersion: { const: 2 } },
    });
    expect(schema.$defs.textLayer).toBeDefined();
    expect(schema.$defs.imageLayer).toBeDefined();
    const validate = new Ajv2020({ strict: false }).compile(schema);
    expect(validate(recipe)).toBe(true);
    expect(validate.errors).toBeNull();
  });
});
