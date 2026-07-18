import type {
  CornerRadius,
  ImageWatermarkLayer,
  ImageOptions,
  MarkOptions,
  PositionOptions,
  TextBackgroundStyle,
  TextStyle,
  TextWatermarkLayer,
  WatermarkLayout,
} from './index';
import { validateMarkOptions } from './validate';

export const WATERMARK_RECIPE_SCHEMA_VERSION = 1 as const;

export type WatermarkRecipeSchemaVersion =
  typeof WATERMARK_RECIPE_SCHEMA_VERSION;

export type WatermarkRecipeVariable = string | number | boolean;

export interface WatermarkRecipeCondition {
  variable: string;
  equals: WatermarkRecipeVariable;
}

interface WatermarkRecipeLayerFields {
  /** Draw the layer only when the named variable strictly equals this value. */
  visibleWhen?: WatermarkRecipeCondition;
}

export type WatermarkRecipeLayer =
  | (TextWatermarkLayer & WatermarkRecipeLayerFields)
  | (ImageWatermarkLayer & WatermarkRecipeLayerFields);

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
  /** Recipe document version. Omitted definitions use the current version. */
  schemaVersion?: WatermarkRecipeSchemaVersion;
  /** Ordered layers reused for every input image. */
  watermarks: readonly WatermarkRecipeLayer[];
};

export type WatermarkRecipeDefinition = Omit<
  WatermarkRecipeOptions,
  'schemaVersion' | 'watermarks'
> & {
  schemaVersion: WatermarkRecipeSchemaVersion;
  watermarks: WatermarkRecipeLayer[];
};

/** Keep the existing string result used by native paths and Web data URLs. */
export interface WatermarkStringRecipeResultOptions {
  resultType?: 'string';
}

/** Return encoded browser bytes without creating an object URL. Web only. */
export interface WatermarkBlobRecipeResultOptions {
  resultType: 'blob';
}

export type WatermarkRecipeResultOptions =
  | WatermarkStringRecipeResultOptions
  | WatermarkBlobRecipeResultOptions;

export interface WatermarkRecipeInput {
  /** Source image processed by this recipe invocation. */
  backgroundImage: ImageOptions;
  /** Optional output basename for this input. */
  filename?: string;
  /** Values substituted into text templates and used by layer conditions. */
  variables?: Readonly<Record<string, WatermarkRecipeVariable>>;
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
  /** Version of the serializable recipe definition. */
  readonly schemaVersion: WatermarkRecipeSchemaVersion;
  /** Return a detached definition suitable for JSON persistence. */
  toJSON(): WatermarkRecipeDefinition;
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

function cloneSource<Value>(value: Value): Value {
  if (Array.isArray(value)) {
    return value.map(cloneSource) as Value;
  }
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype === Object.prototype || prototype === null) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, cloneSource(item)])
      ) as Value;
    }
  }
  return value;
}

function cloneCondition(
  condition: WatermarkRecipeCondition | undefined
): WatermarkRecipeCondition | undefined {
  return condition ? { ...condition } : condition;
}

function cloneLayers(
  layers: readonly WatermarkRecipeLayer[],
  cloneImageSources = false
): WatermarkRecipeLayer[] {
  return layers.map((layer) => {
    if (layer.type === 'text') {
      return {
        ...layer,
        position: clonePosition(layer.position),
        positionOptions: clonePosition(layer.positionOptions),
        layout: cloneLayout(layer.layout),
        style: cloneTextStyle(layer.style),
        visibleWhen: cloneCondition(layer.visibleWhen),
      };
    }
    return {
      ...layer,
      src: cloneImageSources ? cloneSource(layer.src) : layer.src,
      position: clonePosition(layer.position),
      layout: cloneLayout(layer.layout),
      visibleWhen: cloneCondition(layer.visibleWhen),
    };
  });
}

const VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const RESERVED_VARIABLES = new Set(['filename', 'index']);
const ESCAPED_TEMPLATE_OPEN = '\u0000recipe-template-open\u0000';
const TEMPLATE_PATTERN = /\{\{\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*\}\}/g;

function assertVariableValue(
  value: unknown,
  path: string
): asserts value is WatermarkRecipeVariable {
  if (
    (typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean') ||
    (typeof value === 'number' && !Number.isFinite(value))
  ) {
    throw new Error(`${path} must be a string, finite number, or boolean.`);
  }
}

function validateTemplateSyntax(template: string, path: string): void {
  const protectedTemplate = template.replace(/\\\{\{/g, ESCAPED_TEMPLATE_OPEN);
  const unresolved = protectedTemplate.replace(TEMPLATE_PATTERN, '');
  if (unresolved.includes('{{')) {
    throw new Error(
      `${path} contains an invalid variable template; use {{variable}}.`
    );
  }
}

function validateCondition(
  condition: WatermarkRecipeCondition | undefined,
  path: string
): void {
  if (condition === undefined) {
    return;
  }
  if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
    throw new Error(`${path} must be an object.`);
  }
  if (
    typeof condition.variable !== 'string' ||
    !VARIABLE_NAME_PATTERN.test(condition.variable)
  ) {
    throw new Error(`${path}.variable must be a valid variable name.`);
  }
  assertVariableValue(condition.equals, `${path}.equals`);
}

function snapshotRecipeOptions(
  options: WatermarkRecipeOptions
): WatermarkRecipeDefinition {
  if (!options || !Array.isArray(options.watermarks)) {
    throw new Error('createRecipe requires an ordered watermarks array.');
  }
  if (
    options.schemaVersion !== undefined &&
    options.schemaVersion !== WATERMARK_RECIPE_SCHEMA_VERSION
  ) {
    throw new Error(
      `Unsupported recipe schemaVersion: ${String(options.schemaVersion)}.`
    );
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
  for (const [index, layer] of options.watermarks.entries()) {
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
    if (layer.type === 'text') {
      validateTemplateSyntax(layer.text, `watermarks[${index}].text`);
    }
    if (layer.type === 'image' && !layer.src) {
      throw new Error('please set mark image!');
    }
    validateCondition(layer.visibleWhen, `watermarks[${index}].visibleWhen`);
  }

  const definition: WatermarkRecipeDefinition = {
    schemaVersion: WATERMARK_RECIPE_SCHEMA_VERSION,
    watermarks: cloneLayers(options.watermarks),
  };
  if (options.quality !== undefined) definition.quality = options.quality;
  if (options.saveFormat !== undefined)
    definition.saveFormat = options.saveFormat;
  if (options.matteColor !== undefined)
    definition.matteColor = options.matteColor;
  if (options.rotationCanvasMode !== undefined) {
    definition.rotationCanvasMode = options.rotationCanvasMode;
  }
  if (options.maxSize !== undefined) definition.maxSize = options.maxSize;

  validateMarkOptions({
    ...definition,
    backgroundImage: { src: 'recipe-validation-placeholder' },
    watermarks: cloneLayers(definition.watermarks),
  });
  return definition;
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

function createVariableContext(
  input: WatermarkRecipeInput,
  index: number
): Readonly<Record<string, WatermarkRecipeVariable>> {
  const variables = input.variables;
  if (
    variables !== undefined &&
    (!variables || typeof variables !== 'object' || Array.isArray(variables))
  ) {
    throw new Error('variables must be an object.');
  }

  const context: Record<string, WatermarkRecipeVariable> = { index };
  if (input.filename !== undefined) {
    context.filename = input.filename;
  }
  for (const [name, value] of Object.entries(variables ?? {})) {
    if (!VARIABLE_NAME_PATTERN.test(name)) {
      throw new Error(`Invalid recipe variable name "${name}".`);
    }
    if (RESERVED_VARIABLES.has(name)) {
      throw new Error(`Recipe variable "${name}" is reserved.`);
    }
    assertVariableValue(value, `variables.${name}`);
    context[name] = value;
  }
  return context;
}

function readVariable(
  variables: Readonly<Record<string, WatermarkRecipeVariable>>,
  name: string
): WatermarkRecipeVariable {
  if (!Object.prototype.hasOwnProperty.call(variables, name)) {
    throw new Error(`Missing recipe variable "${name}".`);
  }
  const value = variables[name];
  if (value === undefined) {
    throw new Error(`Missing recipe variable "${name}".`);
  }
  return value;
}

function resolveTextTemplate(
  template: string,
  variables: Readonly<Record<string, WatermarkRecipeVariable>>
): string {
  const protectedTemplate = template.replace(/\\\{\{/g, ESCAPED_TEMPLATE_OPEN);
  return protectedTemplate
    .replace(TEMPLATE_PATTERN, (_match, name: string) =>
      String(readVariable(variables, name))
    )
    .split(ESCAPED_TEMPLATE_OPEN)
    .join('{{');
}

function createMarkOptions(
  recipe: WatermarkRecipeDefinition,
  input: WatermarkRecipeInput,
  index: number
): MarkOptions {
  const variables = createVariableContext(input, index);
  const watermarks = cloneLayers(recipe.watermarks)
    .filter((layer) => {
      if (!layer.visibleWhen) {
        return true;
      }
      return (
        readVariable(variables, layer.visibleWhen.variable) ===
        layer.visibleWhen.equals
      );
    })
    .map((layer) => {
      const renderLayer = { ...layer };
      delete renderLayer.visibleWhen;
      if (renderLayer.type === 'text') {
        return {
          ...renderLayer,
          text: resolveTextTemplate(renderLayer.text, variables),
        };
      }
      return renderLayer;
    });
  const options: MarkOptions = {
    backgroundImage: { ...input.backgroundImage },
    watermarks,
    filename: input.filename,
  };
  if (recipe.quality !== undefined) options.quality = recipe.quality;
  if (recipe.saveFormat !== undefined) options.saveFormat = recipe.saveFormat;
  if (recipe.matteColor !== undefined) options.matteColor = recipe.matteColor;
  if (recipe.rotationCanvasMode !== undefined) {
    options.rotationCanvasMode = recipe.rotationCanvasMode;
  }
  if (recipe.maxSize !== undefined) options.maxSize = recipe.maxSize;
  return options;
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

  const applySnapshot = (
    input: WatermarkRecipeInput,
    index: number
  ): Promise<Result> => {
    if (!input?.backgroundImage?.src) {
      return Promise.reject(new Error('please set image!'));
    }
    try {
      return renderer(createMarkOptions(recipe, input, index));
    } catch (error) {
      return Promise.reject(error);
    }
  };

  return {
    schemaVersion: WATERMARK_RECIPE_SCHEMA_VERSION,

    toJSON() {
      return {
        ...recipe,
        watermarks: cloneLayers(recipe.watermarks, true),
      };
    },

    apply(input) {
      return applySnapshot(snapshotInput(input), 0);
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
              value: await applySnapshot(input, index),
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
