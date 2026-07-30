import { cloneRecipeValue } from './clone';
import type {
  WatermarkLayout,
  WatermarkMeasure,
  WatermarkRecipeCondition,
  WatermarkRecipeDefinition,
  WatermarkRecipeLayer,
  WatermarkRecipeOptions,
  WatermarkRecipeOutputOptions,
  WatermarkRecipeValidationResult,
  WatermarkRecipeVariable,
  WatermarkTextBackgroundStyle,
  WatermarkTextStyle,
} from './types';
import { WATERMARK_RECIPE_SCHEMA_VERSION } from './types';

const VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const LAYER_ID_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{0,127}$/;
const TEMPLATE_PATTERN = /\{\{\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*\}\}/g;
const ESCAPED_TEMPLATE_OPEN = '\u0000recipe-template-open\u0000';
const MEASURE_PATTERN = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)%?$/;
const POSITION_VALUES = new Set([
  'topLeft',
  'topCenter',
  'topRight',
  'bottomLeft',
  'bottomCenter',
  'bottomRight',
  'center',
]);
const BLEND_MODES = new Set([
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
]);

export class WatermarkRecipeValidationError extends Error {
  constructor(
    public readonly path: string,
    message: string,
    public readonly code = 'invalid_recipe'
  ) {
    super(path ? `${path}: ${message}` : message);
    this.name = 'WatermarkRecipeValidationError';
  }
}

function fail(path: string, message: string, code?: string): never {
  throw new WatermarkRecipeValidationError(path, message, code);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertBoolean(value: unknown, path: string): void {
  if (value !== undefined && typeof value !== 'boolean') {
    fail(path, 'must be a boolean.');
  }
}

function assertFinite(
  value: unknown,
  path: string,
  options: { positive?: boolean; nonNegative?: boolean; integer?: boolean } = {}
): void {
  if (value === undefined) return;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    (options.integer && !Number.isInteger(value)) ||
    (options.positive && value <= 0) ||
    (options.nonNegative && value < 0)
  ) {
    const qualifier = options.positive
      ? 'positive finite'
      : options.nonNegative
      ? 'non-negative finite'
      : 'finite';
    fail(
      path,
      `must be a ${qualifier}${options.integer ? ' integer' : ' number'}.`
    );
  }
}

function assertMeasure(
  value: unknown,
  path: string,
  nonNegative = false
): asserts value is WatermarkMeasure | undefined {
  if (value === undefined) return;
  if (
    (typeof value !== 'number' || !Number.isFinite(value)) &&
    (typeof value !== 'string' || !MEASURE_PATTERN.test(value.trim()))
  ) {
    fail(path, 'must be a finite number or percentage.');
  }
  if (nonNegative && Number.parseFloat(String(value)) < 0) {
    fail(path, 'must be non-negative.');
  }
}

export function assertWatermarkRecipeVariable(
  value: unknown,
  path: string
): asserts value is WatermarkRecipeVariable {
  if (
    (typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean') ||
    (typeof value === 'number' && !Number.isFinite(value))
  ) {
    fail(path, 'must be a string, finite number, or boolean.');
  }
}

export function validateWatermarkTemplate(
  template: string,
  path = 'template'
): void {
  const protectedTemplate = template.replace(/\\\{\{/g, ESCAPED_TEMPLATE_OPEN);
  const unresolved = protectedTemplate.replace(TEMPLATE_PATTERN, '');
  if (unresolved.includes('{{')) {
    fail(path, 'contains an invalid variable template; use {{variable}}.');
  }
}

function validateCondition(
  condition: WatermarkRecipeCondition | undefined,
  path: string
): void {
  if (condition === undefined) return;
  if (!isObject(condition)) fail(path, 'must be an object.');
  if (
    typeof condition.variable !== 'string' ||
    !VARIABLE_NAME_PATTERN.test(condition.variable)
  ) {
    fail(`${path}.variable`, 'must be a valid variable name.');
  }
  assertWatermarkRecipeVariable(condition.equals, `${path}.equals`);
}

function validatePosition(value: unknown, path: string): void {
  if (value === undefined) return;
  if (!isObject(value)) fail(path, 'must be an object.');
  assertMeasure(value.X, `${path}.X`);
  assertMeasure(value.Y, `${path}.Y`);
  assertMeasure(value.edgeInset, `${path}.edgeInset`, true);
  if (
    value.position !== undefined &&
    (typeof value.position !== 'string' || !POSITION_VALUES.has(value.position))
  ) {
    fail(`${path}.position`, 'is not a supported anchor.');
  }
}

function validateLayout(
  layout: WatermarkLayout | undefined,
  hasPosition: boolean,
  path: string
): void {
  if (layout === undefined) return;
  if (!isObject(layout)) fail(path, 'must be an object.');
  const type = layout.type ?? 'single';
  if (type !== 'single' && type !== 'tile') {
    fail(`${path}.type`, 'must be "single" or "tile".');
  }
  if (type === 'tile' && hasPosition) {
    fail(path, 'cannot be combined with position.');
  }
  if (type === 'tile') {
    const tiled = layout as Extract<WatermarkLayout, { type: 'tile' }>;
    assertMeasure(tiled.gapX, `${path}.gapX`, true);
    assertMeasure(tiled.gapY, `${path}.gapY`, true);
    assertMeasure(tiled.offsetX, `${path}.offsetX`);
    assertMeasure(tiled.offsetY, `${path}.offsetY`);
    assertBoolean(tiled.stagger, `${path}.stagger`);
  }
}

function validateColor(value: unknown, path: string): void {
  if (value !== undefined && (typeof value !== 'string' || !value.trim())) {
    fail(path, 'must be a non-empty string.');
  }
}

function validateTextBackground(
  value: WatermarkTextBackgroundStyle | null | undefined,
  path: string
): void {
  if (value === undefined || value === null) return;
  if (!isObject(value)) fail(path, 'must be an object or null.');
  validateColor(value.color, `${path}.color`);
  if (
    value.type !== undefined &&
    value.type !== null &&
    value.type !== 'stretchX' &&
    value.type !== 'stretchY' &&
    value.type !== 'fit'
  ) {
    fail(`${path}.type`, 'is not supported.');
  }
  for (const key of [
    'padding',
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'paddingBottom',
    'paddingHorizontal',
    'paddingVertical',
    'paddingX',
    'paddingY',
  ] as const) {
    assertMeasure(value[key], `${path}.${key}`, true);
  }
  if (value.cornerRadius !== undefined) {
    if (!isObject(value.cornerRadius)) {
      fail(`${path}.cornerRadius`, 'must be an object.');
    }
    for (const key of [
      'topLeft',
      'topRight',
      'bottomLeft',
      'bottomRight',
      'all',
    ] as const) {
      const radius = value.cornerRadius[key];
      if (radius === undefined) continue;
      if (!isObject(radius)) {
        fail(`${path}.cornerRadius.${key}`, 'must be an object.');
      }
      assertMeasure(radius.x, `${path}.cornerRadius.${key}.x`, true);
      assertMeasure(radius.y, `${path}.cornerRadius.${key}.y`, true);
    }
  }
}

function validateTextStyle(
  style: WatermarkTextStyle | undefined,
  path: string
): void {
  if (style === undefined) return;
  if (!style || typeof style !== 'object' || Array.isArray(style)) {
    fail(path, 'must be an object.');
  }
  validateColor(style.color, `${path}.color`);
  validateColor(style.fontName, `${path}.fontName`);
  if (
    style.fontFallbacks !== undefined &&
    (!Array.isArray(style.fontFallbacks) ||
      style.fontFallbacks.some(
        (font) => typeof font !== 'string' || !font.trim()
      ))
  ) {
    fail(`${path}.fontFallbacks`, 'must contain non-empty font names.');
  }
  assertFinite(style.fontSize, `${path}.fontSize`, { positive: true });
  assertFinite(style.fontSizeRatio, `${path}.fontSizeRatio`, {
    positive: true,
  });
  assertMeasure(style.maxWidth, `${path}.maxWidth`, true);
  assertFinite(style.lineHeight, `${path}.lineHeight`, { positive: true });
  assertFinite(style.letterSpacing, `${path}.letterSpacing`);
  assertFinite(style.skewX, `${path}.skewX`);
  assertFinite(style.rotate, `${path}.rotate`);
  assertFinite(style.maxLines, `${path}.maxLines`, {
    positive: true,
    integer: true,
  });
  if (
    style.direction !== undefined &&
    style.direction !== 'auto' &&
    style.direction !== 'ltr' &&
    style.direction !== 'rtl'
  ) {
    fail(`${path}.direction`, 'must be "auto", "ltr", or "rtl".');
  }
  if (
    style.wrap !== undefined &&
    style.wrap !== 'word' &&
    style.wrap !== 'character' &&
    style.wrap !== 'none'
  ) {
    fail(`${path}.wrap`, 'must be "word", "character", or "none".');
  }
  if (
    style.overflow !== undefined &&
    style.overflow !== 'clip' &&
    style.overflow !== 'ellipsis'
  ) {
    fail(`${path}.overflow`, 'must be "clip" or "ellipsis".');
  }
  if (style.strokeStyle !== undefined && style.strokeStyle !== null) {
    if (!isObject(style.strokeStyle)) {
      fail(`${path}.strokeStyle`, 'must be an object or null.');
    }
    validateColor(style.strokeStyle.color, `${path}.strokeStyle.color`);
    assertFinite(style.strokeStyle.width, `${path}.strokeStyle.width`, {
      nonNegative: true,
    });
  }
  if (style.shadowStyle !== undefined && style.shadowStyle !== null) {
    if (!isObject(style.shadowStyle)) {
      fail(`${path}.shadowStyle`, 'must be an object or null.');
    }
    assertFinite(style.shadowStyle.dx, `${path}.shadowStyle.dx`);
    assertFinite(style.shadowStyle.dy, `${path}.shadowStyle.dy`);
    assertFinite(style.shadowStyle.radius, `${path}.shadowStyle.radius`, {
      nonNegative: true,
    });
    validateColor(style.shadowStyle.color, `${path}.shadowStyle.color`);
  }
  validateTextBackground(
    style.textBackgroundStyle,
    `${path}.textBackgroundStyle`
  );
  for (const key of ['underline', 'strikeThrough', 'italic', 'bold'] as const) {
    assertBoolean(style[key], `${path}.${key}`);
  }
  if (
    style.textAlign !== undefined &&
    style.textAlign !== 'left' &&
    style.textAlign !== 'center' &&
    style.textAlign !== 'right'
  ) {
    fail(`${path}.textAlign`, 'must be "left", "center", or "right".');
  }
}

function validateLayer<Source>(
  layer: WatermarkRecipeLayer<Source>,
  path: string,
  requireId: boolean
): void {
  if (!isObject(layer)) fail(path, 'must be an object.');
  if (layer.type !== 'text' && layer.type !== 'image') {
    fail(`${path}.type`, 'must be "text" or "image".');
  }
  if (requireId && layer.id === undefined) {
    fail(`${path}.id`, 'is required.');
  }
  if (layer.id !== undefined && !LAYER_ID_PATTERN.test(layer.id)) {
    fail(
      `${path}.id`,
      'must start with a letter and contain only letters, numbers, ".", "_", or "-".'
    );
  }
  if (
    layer.name !== undefined &&
    (typeof layer.name !== 'string' || !layer.name.trim())
  ) {
    fail(`${path}.name`, 'must be a non-empty string.');
  }
  if (layer.groupId !== undefined && !LAYER_ID_PATTERN.test(layer.groupId)) {
    fail(`${path}.groupId`, 'must use the layer ID character set.');
  }
  assertBoolean(layer.visible, `${path}.visible`);
  assertBoolean(layer.locked, `${path}.locked`);
  validateCondition(layer.visibleWhen, `${path}.visibleWhen`);
  assertFinite(layer.alpha, `${path}.alpha`, { nonNegative: true });
  if (layer.alpha !== undefined && layer.alpha > 1) {
    fail(`${path}.alpha`, 'must be between 0 and 1.');
  }
  if (layer.blendMode !== undefined && !BLEND_MODES.has(layer.blendMode)) {
    fail(`${path}.blendMode`, 'is not supported.');
  }
  validatePosition(layer.position, `${path}.position`);
  validateLayout(layer.layout, layer.position !== undefined, `${path}.layout`);

  if (layer.type === 'text') {
    if (typeof layer.text !== 'string') {
      fail(`${path}.text`, 'is required.');
    }
    validateWatermarkTemplate(layer.text, `${path}.text`);
    validateTextStyle(layer.style, `${path}.style`);
  } else {
    if (layer.src === undefined || layer.src === null) {
      fail(`${path}.src`, 'is required.');
    }
    assertFinite(layer.scale, `${path}.scale`, { positive: true });
    assertFinite(layer.rotate, `${path}.rotate`);
    assertBoolean(
      layer.trimTransparentPadding,
      `${path}.trimTransparentPadding`
    );
  }
}

function validateOutput(
  output: WatermarkRecipeOutputOptions | undefined,
  path: string
): void {
  if (output === undefined) return;
  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    fail(path, 'must be an object.');
  }
  assertFinite(output.quality, `${path}.quality`, {
    nonNegative: true,
    integer: true,
  });
  if (output.quality !== undefined && output.quality > 100) {
    fail(`${path}.quality`, 'must be between 0 and 100.');
  }
  assertFinite(output.maxSize, `${path}.maxSize`, {
    positive: true,
    integer: true,
  });
  if (
    output.saveFormat !== undefined &&
    output.saveFormat !== 'jpg' &&
    output.saveFormat !== 'png' &&
    output.saveFormat !== 'webp' &&
    output.saveFormat !== 'base64'
  ) {
    fail(`${path}.saveFormat`, 'is not supported.');
  }
  if (
    output.rotationCanvasMode !== undefined &&
    output.rotationCanvasMode !== 'expand' &&
    output.rotationCanvasMode !== 'crop'
  ) {
    fail(`${path}.rotationCanvasMode`, 'must be "expand" or "crop".');
  }
  validateColor(output.matteColor, `${path}.matteColor`);
}

function normalizeOptions<Source>(
  options: WatermarkRecipeOptions<Source>,
  requireIds: boolean
): WatermarkRecipeDefinition<Source> {
  if (!isObject(options)) fail('', 'Recipe must be an object.');
  if (
    options.schemaVersion !== undefined &&
    options.schemaVersion !== WATERMARK_RECIPE_SCHEMA_VERSION
  ) {
    fail(
      'schemaVersion',
      `unsupported version ${String(options.schemaVersion)}.`,
      'unsupported_schema'
    );
  }
  if (!Array.isArray(options.layers) || options.layers.length === 0) {
    fail('layers', 'must be a non-empty array.');
  }
  const ids = new Set<string>();
  const layers = options.layers.map((sourceLayer, index) => {
    validateLayer(sourceLayer, `layers[${index}]`, requireIds);
    const id = sourceLayer.id ?? `layer-${index + 1}`;
    if (ids.has(id)) fail(`layers[${index}].id`, `duplicates "${id}".`);
    ids.add(id);
    return { ...cloneRecipeValue(sourceLayer), id };
  });
  validateOutput(options.output, 'output');
  return {
    schemaVersion: WATERMARK_RECIPE_SCHEMA_VERSION,
    layers,
    output: cloneRecipeValue(options.output ?? {}),
  };
}

export function createWatermarkRecipeDefinition<Source>(
  options: WatermarkRecipeOptions<Source>
): WatermarkRecipeDefinition<Source> {
  return normalizeOptions(options, false);
}

export function validateWatermarkRecipe<Source = unknown>(
  value: unknown
): WatermarkRecipeDefinition<Source> {
  if (!isObject(value)) fail('', 'Recipe must be an object.');
  if (value.schemaVersion !== WATERMARK_RECIPE_SCHEMA_VERSION) {
    fail(
      'schemaVersion',
      `must be ${WATERMARK_RECIPE_SCHEMA_VERSION}.`,
      'unsupported_schema'
    );
  }
  return normalizeOptions(
    value as unknown as WatermarkRecipeOptions<Source>,
    true
  );
}

export function safeValidateWatermarkRecipe<Source = unknown>(
  value: unknown
): WatermarkRecipeValidationResult<Source> {
  try {
    return { success: true, value: validateWatermarkRecipe<Source>(value) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export const recipeValidationPatterns = {
  layerId: LAYER_ID_PATTERN,
  variableName: VARIABLE_NAME_PATTERN,
  template: TEMPLATE_PATTERN,
} as const;
