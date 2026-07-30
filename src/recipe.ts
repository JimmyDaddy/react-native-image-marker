import {
  cloneRecipeValue,
  createWatermarkRecipeDefinition,
  materializeWatermarkRecipe,
  migrateWatermarkRecipe as migrateSharedRecipe,
  WATERMARK_RECIPE_SCHEMA_VERSION,
  type LegacyWatermarkRecipeDefinition as SharedLegacyWatermarkRecipeDefinition,
  type WatermarkRecipeCondition as SharedWatermarkRecipeCondition,
  type WatermarkRecipeDefinition as SharedWatermarkRecipeDefinition,
  type WatermarkRecipeDefinitionLayer as SharedWatermarkRecipeDefinitionLayer,
  type WatermarkRecipeDocument as SharedWatermarkRecipeDocument,
  type WatermarkRecipeInput as SharedWatermarkRecipeInput,
  type WatermarkRecipeLayer as SharedWatermarkRecipeLayer,
  type WatermarkRecipeOptions as SharedWatermarkRecipeOptions,
  type WatermarkRecipeOutputOptions as SharedWatermarkRecipeOutputOptions,
  type WatermarkRecipeSchemaVersion as SharedWatermarkRecipeSchemaVersion,
  type WatermarkRecipeVariable as SharedWatermarkRecipeVariable,
} from '@image-marker/recipe';

import type {
  ImageWatermarkLayer,
  MarkOptions,
  TextWatermarkLayer,
} from './index';
import type { MarkerResult } from './result';
import type { MarkerJobOptions } from './job';
import { validateMarkOptions } from './validate';
import { runWatermarkBatch } from './batch';
import type { WatermarkBatchOptions, WatermarkBatchResult } from './batch';

export type {
  WatermarkBatchAbortedResult,
  WatermarkBatchFulfilledResult,
  WatermarkBatchOptions,
  WatermarkBatchProgress,
  WatermarkBatchRejectedResult,
  WatermarkBatchResult,
} from './batch';

export { WATERMARK_RECIPE_SCHEMA_VERSION };

export type WatermarkRecipeSchemaVersion = SharedWatermarkRecipeSchemaVersion;
export type WatermarkRecipeVariable = SharedWatermarkRecipeVariable;
export type WatermarkRecipeCondition = SharedWatermarkRecipeCondition;
export type WatermarkRecipeLayer = SharedWatermarkRecipeLayer<any>;
export type WatermarkRecipeDefinitionLayer =
  SharedWatermarkRecipeDefinitionLayer<any>;
export type WatermarkRecipeOutputOptions = SharedWatermarkRecipeOutputOptions;
export type WatermarkRecipeOptions = SharedWatermarkRecipeOptions<any>;
export type WatermarkRecipeDefinition = SharedWatermarkRecipeDefinition<any>;
export type LegacyWatermarkRecipeDefinition =
  SharedLegacyWatermarkRecipeDefinition<any>;
export type WatermarkRecipeDocument = SharedWatermarkRecipeDocument<any>;
export type WatermarkRecipeInput = SharedWatermarkRecipeInput<any>;

/** Return the Core 2 structured result. */
export interface WatermarkMarkerResultRecipeOptions {
  resultType?: 'result';
}

/** Return encoded browser bytes without creating an object URL. Web only. */
export interface WatermarkBlobRecipeResultOptions {
  resultType: 'blob';
}

export type WatermarkRecipeResultOptions =
  | WatermarkMarkerResultRecipeOptions
  | WatermarkBlobRecipeResultOptions;

export interface WatermarkRecipe<Result = MarkerResult> {
  /** Version of the serializable recipe definition. */
  readonly schemaVersion: WatermarkRecipeSchemaVersion;
  /** Return a detached definition suitable for JSON persistence. */
  toJSON(): WatermarkRecipeDefinition;
  /** Apply the saved layers and output settings to one source image. */
  apply(
    input: WatermarkRecipeInput,
    control?: MarkerJobOptions
  ): Promise<Result>;
  /** Apply the recipe to many images while preserving input result order. */
  applyMany(
    inputs: readonly WatermarkRecipeInput[],
    options?: WatermarkBatchOptions<Result>
  ): Promise<Array<WatermarkBatchResult<Result>>>;
}

type RecipeRenderer<Result> = (
  options: MarkOptions,
  control?: MarkerJobOptions
) => Promise<Result>;

function toRenderLayer(
  layer: WatermarkRecipeDefinitionLayer
): TextWatermarkLayer | ImageWatermarkLayer {
  const renderLayer = { ...layer } as WatermarkRecipeLayer &
    Record<string, unknown>;
  delete renderLayer.id;
  delete renderLayer.name;
  delete renderLayer.visible;
  delete renderLayer.locked;
  delete renderLayer.groupId;
  delete renderLayer.visibleWhen;
  return renderLayer as TextWatermarkLayer | ImageWatermarkLayer;
}

function snapshotRecipeOptions(
  options: WatermarkRecipeOptions
): WatermarkRecipeDefinition {
  if (!options || !Array.isArray(options.layers)) {
    throw new Error('createRecipe requires an ordered layers array.');
  }
  if (
    options.schemaVersion !== undefined &&
    options.schemaVersion !== WATERMARK_RECIPE_SCHEMA_VERSION
  ) {
    throw new Error(
      `Unsupported recipe schemaVersion: ${String(options.schemaVersion)}.`
    );
  }
  if (options.layers.length === 0) {
    throw new Error('createRecipe requires at least one layer.');
  }
  const ids = new Set<string>();
  options.layers.forEach((layer, index) => {
    if (layer.type === 'image' && !layer.src) {
      throw new Error(`layers[${index}].src is required.`);
    }
    const id = layer.id ?? `layer-${index + 1}`;
    if (ids.has(id)) throw new Error(`Duplicate layer id "${id}".`);
    ids.add(id);
  });
  const runtimeOptions = options as WatermarkRecipeOptions &
    Record<string, unknown>;
  const unsupportedKey = [
    'backgroundImage',
    'filename',
    'watermarkTexts',
    'watermarkImage',
    'watermarkPositions',
    'watermarkImages',
    'watermarks',
    'quality',
    'saveFormat',
    'matteColor',
    'rotationCanvasMode',
    'maxSize',
  ].find((key) => Object.prototype.hasOwnProperty.call(runtimeOptions, key));
  if (unsupportedKey) {
    throw new Error(
      `createRecipe does not accept "${unsupportedKey}" in Recipe v2; use ordered layers, put encoding options under output, and pass per-image fields to apply().`
    );
  }

  const definition = createWatermarkRecipeDefinition(options);
  definition.layers.forEach((layer, index) => {
    const original = options.layers[index];
    if (layer.type === 'image' && original?.type === 'image') {
      layer.src = original.src;
    }
  });
  validateMarkOptions({
    backgroundImage: { src: 'recipe-validation-placeholder' },
    watermarks: definition.layers.map(toRenderLayer),
    ...definition.output,
  } as MarkOptions);
  return definition;
}

/**
 * Upgrade a serialized Recipe v1 document to the v2 layer/output structure.
 */
export function migrateWatermarkRecipe(
  document: WatermarkRecipeDocument
): WatermarkRecipeDefinition {
  return snapshotRecipeOptions(migrateSharedRecipe(document));
}

function snapshotInput(input: WatermarkRecipeInput): WatermarkRecipeInput {
  return {
    backgroundImage: input?.backgroundImage
      ? { ...input.backgroundImage }
      : input?.backgroundImage,
    filename: input?.filename,
    variables: input?.variables ? { ...input.variables } : input?.variables,
  };
}

function createMarkOptions(
  recipe: WatermarkRecipeDefinition,
  input: WatermarkRecipeInput,
  index: number
): MarkOptions {
  const materialized = materializeWatermarkRecipe(recipe, {
    filename: input.filename,
    index,
    variables: input.variables,
  });
  const imageSources = new Map<string, unknown>();
  recipe.layers.forEach((layer) => {
    if (layer.type === 'image') {
      imageSources.set(layer.id, layer.src);
    }
  });
  materialized.layers.forEach((layer) => {
    if (layer.type === 'image' && imageSources.has(layer.id)) {
      layer.src = imageSources.get(layer.id);
    }
  });
  return {
    backgroundImage: { ...input.backgroundImage },
    watermarks: materialized.layers.map(toRenderLayer),
    filename: input.filename,
    ...materialized.output,
  } as MarkOptions;
}

function canonicalOutputFilename(
  filename: string,
  saveFormat: WatermarkRecipeOutputOptions['saveFormat']
): string | undefined {
  const trimmed = filename.trim();
  if (!trimmed) return undefined;
  const knownExtension = ['.jpeg', '.jpg', '.png', '.webp'].find((extension) =>
    trimmed.toLowerCase().endsWith(extension)
  );
  const stem = knownExtension
    ? trimmed.slice(0, -knownExtension.length)
    : trimmed;
  const extension =
    saveFormat === 'png' ? '.png' : saveFormat === 'webp' ? '.webp' : '.jpg';
  return `${stem}${extension}`.toLowerCase();
}

function validateUniqueFilenames(
  inputs: readonly WatermarkRecipeInput[],
  saveFormat: WatermarkRecipeOutputOptions['saveFormat']
): void {
  const seen = new Map<string, number>();
  inputs.forEach((input, index) => {
    if (input.filename === undefined) return;
    if (typeof input.filename !== 'string') {
      throw new Error(`inputs[${index}].filename must be a string.`);
    }
    const canonical = canonicalOutputFilename(input.filename, saveFormat);
    if (!canonical) return;
    const previousIndex = seen.get(canonical);
    if (previousIndex !== undefined) {
      throw new Error(
        `Duplicate output filename "${canonical}" for inputs ${previousIndex} and ${index}.`
      );
    }
    seen.set(canonical, index);
  });
}

export function createWatermarkRecipe<Result>(
  options: WatermarkRecipeOptions,
  renderer: RecipeRenderer<Result>,
  maximumConcurrency = 1
): WatermarkRecipe<Result> {
  const recipe = snapshotRecipeOptions(options);

  const applySnapshot = (
    input: WatermarkRecipeInput,
    index: number,
    control?: MarkerJobOptions
  ): Promise<Result> => {
    if (!input?.backgroundImage?.src) {
      return Promise.reject(new Error('please set image!'));
    }
    try {
      return renderer(createMarkOptions(recipe, input, index), control);
    } catch (error) {
      return Promise.reject(error);
    }
  };

  return {
    schemaVersion: WATERMARK_RECIPE_SCHEMA_VERSION,

    toJSON() {
      return cloneRecipeValue(recipe);
    },

    apply(input, control) {
      return applySnapshot(snapshotInput(input), 0, control);
    },

    async applyMany(inputs, batchOptions = {}) {
      if (!Array.isArray(inputs)) {
        throw new Error('applyMany inputs must be an array.');
      }
      const queuedInputs = inputs.map(snapshotInput);
      validateUniqueFilenames(queuedInputs, recipe.output.saveFormat);
      return runWatermarkBatch(
        queuedInputs,
        (input, index) =>
          applySnapshot(input, index, { signal: batchOptions.signal }),
        batchOptions,
        maximumConcurrency,
        'applyMany'
      );
    },
  };
}

export function importWatermarkRecipe<Result>(
  document: WatermarkRecipeDocument,
  renderer: RecipeRenderer<Result>,
  maximumConcurrency = 1
): WatermarkRecipe<Result> {
  return createWatermarkRecipe(
    migrateWatermarkRecipe(document),
    renderer,
    maximumConcurrency
  );
}
