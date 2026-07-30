import { migrateWatermarkRecipe } from './migration';
import type {
  WatermarkRecipeDefinition,
  WatermarkRecipeDocument,
} from './types';

export function parseWatermarkRecipe<Source = unknown>(
  source: string
): WatermarkRecipeDefinition<Source> {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (error) {
    throw new Error(
      `Recipe JSON is invalid: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  return migrateWatermarkRecipe<Source>(value);
}

export function serializeWatermarkRecipe<Source>(
  document: WatermarkRecipeDocument<Source>,
  space: number | string = 2
): string {
  return JSON.stringify(migrateWatermarkRecipe(document), null, space);
}
