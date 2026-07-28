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

export const WATERMARK_RECIPE_SCHEMA_VERSION = 2 as const;

export type WatermarkRecipeSchemaVersion =
  typeof WATERMARK_RECIPE_SCHEMA_VERSION;

export type WatermarkRecipeVariable = string | number | boolean;

export interface WatermarkRecipeCondition {
  variable: string;
  equals: WatermarkRecipeVariable;
}

interface WatermarkRecipeLayerFields {
  /** Stable layer ID used by editors, patches, and serialized recipes. */
  id?: string;
  /** Optional human-readable layer name. */
  name?: string;
  /** Hidden layers remain serialized but are not rendered. @defaultValue true */
  visible?: boolean;
  /** Editors should prevent direct manipulation of locked layers. */
  locked?: boolean;
  /** Draw the layer only when the named variable strictly equals this value. */
  visibleWhen?: WatermarkRecipeCondition;
}

export type WatermarkRecipeLayer =
  | (TextWatermarkLayer & WatermarkRecipeLayerFields)
  | (ImageWatermarkLayer & WatermarkRecipeLayerFields);

export type WatermarkRecipeDefinitionLayer = WatermarkRecipeLayer & {
  id: string;
};

export interface WatermarkRecipeOutputOptions {
  quality?: MarkOptions['quality'];
  saveFormat?: MarkOptions['saveFormat'];
  matteColor?: MarkOptions['matteColor'];
  rotationCanvasMode?: MarkOptions['rotationCanvasMode'];
  maxSize?: MarkOptions['maxSize'];
}

export interface WatermarkRecipeOptions {
  /** Recipe document version. Omitted definitions use the current version. */
  schemaVersion?: WatermarkRecipeSchemaVersion;
  /** Ordered layers reused for every input image. */
  layers: readonly WatermarkRecipeLayer[];
  /** Output encoding and decode policy, separate from editable layers. */
  output?: WatermarkRecipeOutputOptions;
}

export interface WatermarkRecipeDefinition {
  schemaVersion: WatermarkRecipeSchemaVersion;
  layers: WatermarkRecipeDefinitionLayer[];
  output: WatermarkRecipeOutputOptions;
}

export interface LegacyWatermarkRecipeDefinition
  extends WatermarkRecipeOutputOptions {
  schemaVersion: 1;
  watermarks: WatermarkRecipeLayer[];
}

export type WatermarkRecipeDocument =
  | WatermarkRecipeDefinition
  | LegacyWatermarkRecipeDefinition;

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

export interface WatermarkRecipeInput {
  /** Source image processed by this recipe invocation. */
  backgroundImage: ImageOptions;
  /** Optional output basename for this input. */
  filename?: string;
  /** Values substituted into text templates and used by layer conditions. */
  variables?: Readonly<Record<string, WatermarkRecipeVariable>>;
}

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
    fontFallbacks: style.fontFallbacks ? [...style.fontFallbacks] : undefined,
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
): WatermarkRecipeDefinitionLayer[] {
  return layers.map((layer, index) => {
    const id = layer.id ?? `layer-${index + 1}`;
    if (layer.type === 'text') {
      return {
        ...layer,
        id,
        position: clonePosition(layer.position),
        layout: cloneLayout(layer.layout),
        style: cloneTextStyle(layer.style),
        visibleWhen: cloneCondition(layer.visibleWhen),
      };
    }
    return {
      ...layer,
      id,
      src: cloneImageSources ? cloneSource(layer.src) : layer.src,
      position: clonePosition(layer.position),
      layout: cloneLayout(layer.layout),
      visibleWhen: cloneCondition(layer.visibleWhen),
    };
  });
}

const VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const LAYER_ID_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{0,127}$/;
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
  if (options.layers.length === 0) {
    throw new Error('createRecipe requires at least one layer.');
  }
  const layerIds = new Set<string>();
  for (const [index, layer] of options.layers.entries()) {
    const path = `layers[${index}]`;
    if (
      !layer ||
      typeof layer !== 'object' ||
      (layer.type !== 'text' && layer.type !== 'image')
    ) {
      throw new Error(`${path}.type must be either "text" or "image".`);
    }
    const id = layer.id ?? `layer-${index + 1}`;
    if (!LAYER_ID_PATTERN.test(id)) {
      throw new Error(
        `${path}.id must start with a letter and contain only letters, numbers, ".", "_", or "-".`
      );
    }
    if (layerIds.has(id)) {
      throw new Error(`Duplicate layer id "${id}".`);
    }
    layerIds.add(id);
    if (
      layer.name !== undefined &&
      (typeof layer.name !== 'string' || layer.name.trim() === '')
    ) {
      throw new Error(`${path}.name must be a non-empty string.`);
    }
    if (layer.visible !== undefined && typeof layer.visible !== 'boolean') {
      throw new Error(`${path}.visible must be a boolean.`);
    }
    if (layer.locked !== undefined && typeof layer.locked !== 'boolean') {
      throw new Error(`${path}.locked must be a boolean.`);
    }
    if (layer.type === 'text' && typeof layer.text !== 'string') {
      throw new Error(`${path}.text is required.`);
    }
    if (layer.type === 'text') {
      validateTemplateSyntax(layer.text, `${path}.text`);
    }
    if (layer.type === 'image' && !layer.src) {
      throw new Error(`${path}.src is required.`);
    }
    validateCondition(layer.visibleWhen, `${path}.visibleWhen`);
  }

  const definition: WatermarkRecipeDefinition = {
    schemaVersion: WATERMARK_RECIPE_SCHEMA_VERSION,
    layers: cloneLayers(options.layers),
    output: { ...options.output },
  };

  validateMarkOptions({
    backgroundImage: { src: 'recipe-validation-placeholder' },
    watermarks: definition.layers.map(toRenderLayer),
    ...definition.output,
  });
  return definition;
}

function toRenderLayer(
  layer: WatermarkRecipeDefinitionLayer
): TextWatermarkLayer | ImageWatermarkLayer {
  const renderLayer: WatermarkRecipeLayer = { ...layer };
  delete renderLayer.id;
  delete renderLayer.name;
  delete renderLayer.visible;
  delete renderLayer.locked;
  delete renderLayer.visibleWhen;
  return renderLayer;
}

function readLegacyOutput(
  document: LegacyWatermarkRecipeDefinition
): WatermarkRecipeOutputOptions {
  const { quality, saveFormat, matteColor, rotationCanvasMode, maxSize } =
    document;
  return { quality, saveFormat, matteColor, rotationCanvasMode, maxSize };
}

/**
 * Upgrade a serialized Recipe v1 document to the v2 layer/output structure.
 *
 * Runtime creation is deliberately v2-only. Persisted v1 documents must flow
 * through this explicit migration boundary so editors and services can store
 * the upgraded document before rendering it.
 */
export function migrateWatermarkRecipe(
  document: WatermarkRecipeDocument
): WatermarkRecipeDefinition {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error('Recipe document must be an object.');
  }
  if (document.schemaVersion === WATERMARK_RECIPE_SCHEMA_VERSION) {
    return snapshotRecipeOptions({
      schemaVersion: WATERMARK_RECIPE_SCHEMA_VERSION,
      layers: document.layers,
      output: document.output,
    });
  }
  if (document.schemaVersion === 1) {
    return snapshotRecipeOptions({
      schemaVersion: WATERMARK_RECIPE_SCHEMA_VERSION,
      layers: document.watermarks,
      output: readLegacyOutput(document),
    });
  }
  throw new Error(
    `Unsupported recipe schemaVersion: ${String(
      (document as { schemaVersion?: unknown }).schemaVersion
    )}.`
  );
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
  const watermarks = cloneLayers(recipe.layers)
    .filter((layer) => {
      if (layer.visible === false) {
        return false;
      }
      if (!layer.visibleWhen) {
        return true;
      }
      return (
        readVariable(variables, layer.visibleWhen.variable) ===
        layer.visibleWhen.equals
      );
    })
    .map((layer) => {
      const renderLayer = toRenderLayer(layer);
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
    ...recipe.output,
  };
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
      return {
        schemaVersion: recipe.schemaVersion,
        layers: cloneLayers(recipe.layers, true),
        output: { ...recipe.output },
      };
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
  const definition = migrateWatermarkRecipe(document);
  return createWatermarkRecipe(definition, renderer, maximumConcurrency);
}
