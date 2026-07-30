import type {
  LegacyWatermarkRecipeDefinition,
  WatermarkRecipeDefinition,
  WatermarkRecipeDocument,
  WatermarkRecipeOptions,
} from './types';
import {
  createWatermarkRecipeDefinition,
  WatermarkRecipeValidationError,
} from './validation';
import { WATERMARK_RECIPE_SCHEMA_VERSION } from './types';

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readLegacyOutput(document: LegacyWatermarkRecipeDefinition<unknown>) {
  const { quality, saveFormat, matteColor, rotationCanvasMode, maxSize } =
    document;
  return { quality, saveFormat, matteColor, rotationCanvasMode, maxSize };
}

export function migrateWatermarkRecipe<Source = unknown>(
  document: WatermarkRecipeDocument<Source> | unknown
): WatermarkRecipeDefinition<Source> {
  if (!isObject(document)) {
    throw new WatermarkRecipeValidationError(
      '',
      'Recipe document must be an object.'
    );
  }
  if (document.schemaVersion === WATERMARK_RECIPE_SCHEMA_VERSION) {
    return createWatermarkRecipeDefinition(
      document as unknown as WatermarkRecipeOptions<Source>
    );
  }
  if (document.schemaVersion === 1) {
    const legacy =
      document as unknown as LegacyWatermarkRecipeDefinition<Source>;
    return createWatermarkRecipeDefinition({
      schemaVersion: WATERMARK_RECIPE_SCHEMA_VERSION,
      layers: legacy.watermarks,
      output: readLegacyOutput(
        legacy as LegacyWatermarkRecipeDefinition<unknown>
      ),
    });
  }
  throw new WatermarkRecipeValidationError(
    'schemaVersion',
    `unsupported version ${String(document.schemaVersion)}.`,
    'unsupported_schema'
  );
}
