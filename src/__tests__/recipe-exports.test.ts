import {
  addWatermarkRecipeLayer,
  createWatermarkRecipeDefinition,
  parseWatermarkRecipe,
  serializeWatermarkRecipe,
  validateWatermarkRecipe,
} from '../index';

describe('Core Recipe API re-exports', () => {
  it('exposes the platform-neutral authoring API from the Core entry point', () => {
    const definition = createWatermarkRecipeDefinition({
      layers: [{ type: 'text', text: 'Shared API' }],
    });
    const updated = addWatermarkRecipeLayer(definition, {
      type: 'text',
      text: 'Second layer',
    });
    const serialized = serializeWatermarkRecipe(updated);

    expect(validateWatermarkRecipe(parseWatermarkRecipe(serialized))).toEqual(
      expect.objectContaining({
        layers: expect.arrayContaining([
          expect.objectContaining({ text: 'Shared API' }),
          expect.objectContaining({ text: 'Second layer' }),
        ]),
      })
    );
  });
});
