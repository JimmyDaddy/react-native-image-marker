import type {
  WatermarkRecipeDefinition,
  WatermarkRecipeLayer,
  WatermarkRecipeOptions,
} from './types';

export function cloneRecipeValue<Value>(value: Value): Value {
  if (Array.isArray(value)) {
    return value.map(cloneRecipeValue) as Value;
  }
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype === Object.prototype || prototype === null) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          cloneRecipeValue(item),
        ])
      ) as Value;
    }
  }
  return value;
}

export function cloneWatermarkRecipeLayer<Source>(
  layer: WatermarkRecipeLayer<Source>
): WatermarkRecipeLayer<Source> {
  return cloneRecipeValue(layer);
}

export function cloneWatermarkRecipe<Source>(
  recipe: WatermarkRecipeDefinition<Source> | WatermarkRecipeOptions<Source>
): WatermarkRecipeDefinition<Source> | WatermarkRecipeOptions<Source> {
  return cloneRecipeValue(recipe);
}
