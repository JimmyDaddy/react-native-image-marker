import type {
  CornerRadius,
  ImageOptions,
  MarkOptions,
  PositionOptions,
  TextBackgroundStyle,
  TextStyle,
  WatermarkLayer,
  WatermarkLayout,
} from './index';
import { validateMarkOptions } from './validate';

export type WatermarkRecipeOptions = Omit<
  MarkOptions,
  | 'backgroundImage'
  | 'filename'
  | 'watermarks'
  | 'watermarkTexts'
  | 'watermarkImage'
  | 'watermarkPositions'
  | 'watermarkImages'
> & {
  /** Ordered layers reused for every input image. */
  watermarks: readonly WatermarkLayer[];
};

export interface WatermarkRecipeInput {
  /** Source image processed by this recipe invocation. */
  backgroundImage: ImageOptions;
  /** Optional output basename for this input. */
  filename?: string;
}

export interface WatermarkBatchFulfilledResult<Result> {
  status: 'fulfilled';
  value: Result;
}

export interface WatermarkBatchRejectedResult {
  status: 'rejected';
  reason: unknown;
}

export interface WatermarkBatchAbortedResult {
  status: 'aborted';
  reason: Error;
}

export type WatermarkBatchResult<Result> =
  | WatermarkBatchFulfilledResult<Result>
  | WatermarkBatchRejectedResult
  | WatermarkBatchAbortedResult;

export interface WatermarkBatchProgress<Result> {
  total: number;
  settled: number;
  succeeded: number;
  failed: number;
  aborted: number;
  /** Index of the item that produced this progress update. */
  index: number;
  result: WatermarkBatchResult<Result>;
}

export interface WatermarkBatchOptions<Result> {
  /** Requested worker count. Web is capped at 4 and native targets at 1. */
  concurrency?: number;
  /** Stops new items from starting. Already-running items are allowed to finish. */
  signal?: AbortSignal;
  /** Called once when each item is fulfilled, rejected, or skipped after abort. */
  onProgress?: (progress: WatermarkBatchProgress<Result>) => void;
}

export interface WatermarkRecipe<Result = string> {
  /** Apply the saved layers and output settings to one source image. */
  apply(input: WatermarkRecipeInput): Promise<Result>;
  /** Apply the recipe to many images while preserving input result order. */
  applyMany(
    inputs: readonly WatermarkRecipeInput[],
    options?: WatermarkBatchOptions<Result>
  ): Promise<Array<WatermarkBatchResult<Result>>>;
}

type RecipeRenderer<Result> = (options: MarkOptions) => Promise<Result>;

function clonePosition(
  position: PositionOptions | undefined
): PositionOptions | undefined {
  return position ? { ...position } : position;
}

function cloneLayout(
  layout: WatermarkLayout | undefined
): WatermarkLayout | undefined {
  return layout ? { ...layout } : layout;
}

function cloneCornerRadius(
  cornerRadius: CornerRadius | undefined
): CornerRadius | undefined {
  if (!cornerRadius) {
    return cornerRadius;
  }
  return {
    topLeft: cornerRadius.topLeft ? { ...cornerRadius.topLeft } : undefined,
    topRight: cornerRadius.topRight ? { ...cornerRadius.topRight } : undefined,
    bottomLeft: cornerRadius.bottomLeft
      ? { ...cornerRadius.bottomLeft }
      : undefined,
    bottomRight: cornerRadius.bottomRight
      ? { ...cornerRadius.bottomRight }
      : undefined,
    all: cornerRadius.all ? { ...cornerRadius.all } : undefined,
  };
}

function cloneTextBackgroundStyle(
  style: TextBackgroundStyle | null | undefined
): TextBackgroundStyle | null | undefined {
  if (!style) {
    return style;
  }
  return {
    ...style,
    cornerRadius: cloneCornerRadius(style.cornerRadius),
  };
}

function cloneTextStyle(style: TextStyle | undefined): TextStyle | undefined {
  if (!style) {
    return style;
  }
  return {
    ...style,
    shadowStyle: style.shadowStyle
      ? { ...style.shadowStyle }
      : style.shadowStyle,
    strokeStyle: style.strokeStyle
      ? { ...style.strokeStyle }
      : style.strokeStyle,
    textBackgroundStyle: cloneTextBackgroundStyle(style.textBackgroundStyle),
  };
}

function cloneLayers(layers: readonly WatermarkLayer[]): WatermarkLayer[] {
  return layers.map((layer) => {
    if (layer.type === 'text') {
      return {
        ...layer,
        position: clonePosition(layer.position),
        positionOptions: clonePosition(layer.positionOptions),
        layout: cloneLayout(layer.layout),
        style: cloneTextStyle(layer.style),
      };
    }
    return {
      ...layer,
      position: clonePosition(layer.position),
      layout: cloneLayout(layer.layout),
    };
  });
}

function snapshotRecipeOptions(options: WatermarkRecipeOptions): MarkOptions {
  if (!options || !Array.isArray(options.watermarks)) {
    throw new Error('createRecipe requires an ordered watermarks array.');
  }
  const runtimeOptions = options as WatermarkRecipeOptions &
    Record<string, unknown>;
  const unsupportedKey = [
    'backgroundImage',
    'filename',
    'watermarkTexts',
    'watermarkImage',
    'watermarkPositions',
    'watermarkImages',
  ].find((key) => Object.prototype.hasOwnProperty.call(runtimeOptions, key));
  if (unsupportedKey) {
    throw new Error(
      `createRecipe does not accept "${unsupportedKey}"; use ordered watermarks and pass per-image fields to apply().`
    );
  }
  if (options.watermarks.length === 0) {
    throw new Error('createRecipe requires at least one watermark layer.');
  }
  for (const layer of options.watermarks) {
    if (
      !layer ||
      typeof layer !== 'object' ||
      (layer.type !== 'text' && layer.type !== 'image')
    ) {
      throw new Error('watermark type must be either "text" or "image".');
    }
    if (layer.type === 'text' && typeof layer.text !== 'string') {
      throw new Error('text is required.');
    }
    if (layer.type === 'image' && !layer.src) {
      throw new Error('please set mark image!');
    }
  }

  const snapshot: MarkOptions = {
    backgroundImage: { src: 'recipe-validation-placeholder' },
    watermarks: cloneLayers(options.watermarks),
  };
  if (options.quality !== undefined) snapshot.quality = options.quality;
  if (options.saveFormat !== undefined)
    snapshot.saveFormat = options.saveFormat;
  if (options.matteColor !== undefined)
    snapshot.matteColor = options.matteColor;
  if (options.rotationCanvasMode !== undefined) {
    snapshot.rotationCanvasMode = options.rotationCanvasMode;
  }
  if (options.maxSize !== undefined) snapshot.maxSize = options.maxSize;

  validateMarkOptions(snapshot);
  return snapshot;
}

function snapshotInput(input: WatermarkRecipeInput): WatermarkRecipeInput {
  return {
    backgroundImage: input?.backgroundImage
      ? { ...input.backgroundImage }
      : input?.backgroundImage,
    filename: input?.filename,
  };
}

function createMarkOptions(
  recipe: MarkOptions,
  input: WatermarkRecipeInput
): MarkOptions {
  return {
    ...recipe,
    backgroundImage: { ...input.backgroundImage },
    watermarks: cloneLayers(recipe.watermarks ?? []),
    filename: input.filename,
  };
}

function canonicalOutputFilename(
  filename: string,
  saveFormat: MarkOptions['saveFormat']
): string | undefined {
  const trimmed = filename.trim();
  if (!trimmed) {
    return undefined;
  }
  const knownExtension = ['.jpeg', '.jpg', '.png'].find((extension) =>
    trimmed.toLowerCase().endsWith(extension)
  );
  const stem = knownExtension
    ? trimmed.slice(0, -knownExtension.length)
    : trimmed;
  const extension = saveFormat === 'png' ? '.png' : '.jpg';
  return `${stem}${extension}`.toLowerCase();
}

function validateUniqueFilenames(
  inputs: readonly WatermarkRecipeInput[],
  saveFormat: MarkOptions['saveFormat']
): void {
  const seen = new Map<string, number>();
  inputs.forEach((input, index) => {
    if (input.filename === undefined) {
      return;
    }
    if (typeof input.filename !== 'string') {
      throw new Error(`inputs[${index}].filename must be a string.`);
    }
    const canonical = canonicalOutputFilename(input.filename, saveFormat);
    if (!canonical) {
      return;
    }
    const previousIndex = seen.get(canonical);
    if (previousIndex !== undefined) {
      throw new Error(
        `Duplicate output filename "${canonical}" for inputs ${previousIndex} and ${index}.`
      );
    }
    seen.set(canonical, index);
  });
}

function abortResult<Result>(): WatermarkBatchResult<Result> {
  const reason = new Error(
    'Batch item was not started because the operation was aborted.'
  );
  reason.name = 'AbortError';
  return { status: 'aborted', reason };
}

export function createWatermarkRecipe<Result>(
  options: WatermarkRecipeOptions,
  renderer: RecipeRenderer<Result>,
  maximumConcurrency = 1
): WatermarkRecipe<Result> {
  const recipe = snapshotRecipeOptions(options);

  const applySnapshot = (input: WatermarkRecipeInput): Promise<Result> => {
    if (!input?.backgroundImage?.src) {
      return Promise.reject(new Error('please set image!'));
    }
    return renderer(createMarkOptions(recipe, input));
  };

  return {
    apply(input) {
      return applySnapshot(snapshotInput(input));
    },

    async applyMany(inputs, batchOptions = {}) {
      if (!Array.isArray(inputs)) {
        throw new Error('applyMany inputs must be an array.');
      }
      const requestedConcurrency = batchOptions.concurrency ?? 1;
      if (
        !Number.isFinite(requestedConcurrency) ||
        !Number.isInteger(requestedConcurrency) ||
        requestedConcurrency <= 0
      ) {
        throw new Error('concurrency must be a positive finite integer.');
      }

      const queuedInputs = inputs.map(snapshotInput);
      validateUniqueFilenames(queuedInputs, recipe.saveFormat);
      if (queuedInputs.length === 0) {
        return [];
      }

      const concurrency = Math.min(
        requestedConcurrency,
        maximumConcurrency,
        queuedInputs.length
      );
      const results: Array<WatermarkBatchResult<Result> | undefined> =
        new Array(queuedInputs.length);
      let cursor = 0;
      let settled = 0;
      let succeeded = 0;
      let failed = 0;
      let aborted = 0;

      const report = (
        index: number,
        result: WatermarkBatchResult<Result>
      ): void => {
        settled += 1;
        if (result.status === 'fulfilled') succeeded += 1;
        else if (result.status === 'rejected') failed += 1;
        else aborted += 1;
        try {
          batchOptions.onProgress?.({
            total: queuedInputs.length,
            settled,
            succeeded,
            failed,
            aborted,
            index,
            result,
          });
        } catch {
          // Progress observers must not interrupt the batch or change results.
        }
      };

      const worker = async (): Promise<void> => {
        while (!batchOptions.signal?.aborted) {
          const index = cursor;
          cursor += 1;
          if (index >= queuedInputs.length) {
            return;
          }
          const input = queuedInputs[index];
          if (!input) {
            return;
          }
          let result: WatermarkBatchResult<Result>;
          try {
            result = {
              status: 'fulfilled',
              value: await applySnapshot(input),
            };
          } catch (reason) {
            result = { status: 'rejected', reason };
          }
          results[index] = result;
          report(index, result);
        }
      };

      await Promise.all(Array.from({ length: concurrency }, worker));

      for (let index = 0; index < queuedInputs.length; index += 1) {
        if (!results[index]) {
          const result = abortResult<Result>();
          results[index] = result;
          report(index, result);
        }
      }

      return results as Array<WatermarkBatchResult<Result>>;
    },
  };
}
