import type {
  BlendMode,
  ImageMarkOptions,
  ImageOptions,
  MarkOptions,
  TextOptions,
  TextMarkOptions,
  WatermarkImageOptions,
  WatermarkLayout,
} from './index';

const SUPPORTED_BLEND_MODES = new Set<BlendMode>([
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
]);

type MarkRequestOptions = TextMarkOptions | ImageMarkOptions | MarkOptions;

function validateQuality(options: MarkRequestOptions): void {
  const { quality } = options;

  if (
    quality !== undefined &&
    (!Number.isFinite(quality) ||
      !Number.isInteger(quality) ||
      quality < 0 ||
      quality > 100)
  ) {
    throw new Error('quality must be a finite integer between 0 and 100.');
  }
}

function validateMaxSize(options: MarkRequestOptions): void {
  const { maxSize } = options;

  if (
    maxSize !== undefined &&
    (!Number.isFinite(maxSize) || !Number.isInteger(maxSize) || maxSize <= 0)
  ) {
    throw new Error('maxSize must be a positive finite integer.');
  }
}

function validateAlpha(
  options: Pick<ImageOptions, 'alpha'> | undefined,
  path: string
): void {
  const alpha = options?.alpha;

  if (
    alpha !== undefined &&
    (!Number.isFinite(alpha) || alpha < 0 || alpha > 1)
  ) {
    throw new Error(`${path}.alpha must be a finite number between 0 and 1.`);
  }
}

function validateBlendMode(
  blendMode: BlendMode | undefined,
  path: string
): void {
  if (blendMode !== undefined && !SUPPORTED_BLEND_MODES.has(blendMode)) {
    throw new Error(
      `${path}.blendMode is not supported: ${String(blendMode)}.`
    );
  }
}

function validateCommonOptions(options: MarkRequestOptions): void {
  validateQuality(options);
  validateMaxSize(options);
  validateAlpha(options.backgroundImage, 'backgroundImage');
  const saveFormat = options.saveFormat;
  if (
    saveFormat !== undefined &&
    saveFormat !== 'jpg' &&
    saveFormat !== 'png' &&
    saveFormat !== 'webp' &&
    saveFormat !== 'base64'
  ) {
    throw new Error(`saveFormat is not supported: ${String(saveFormat)}.`);
  }
}

function validateLayoutValue(
  value: number | string | undefined,
  path: string,
  nonNegative: boolean
): void {
  if (value === undefined) {
    return;
  }
  const normalized = typeof value === 'string' ? value.trim() : value;
  const valid =
    typeof normalized === 'number'
      ? Number.isFinite(normalized)
      : /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(%)?$/.test(normalized);
  if (!valid) {
    throw new Error(`${path} must be a finite number or percentage.`);
  }
  if (nonNegative && Number.parseFloat(String(normalized)) < 0) {
    throw new Error(`${path} must be non-negative.`);
  }
}

function validateWatermarkLayout(
  layout: WatermarkLayout | undefined,
  hasPosition: boolean,
  path: string
): void {
  if (!layout) {
    return;
  }
  if (typeof layout !== 'object' || Array.isArray(layout)) {
    throw new Error(`${path} must be an object.`);
  }
  const type = layout.type ?? 'single';
  if (type !== 'single' && type !== 'tile') {
    throw new Error(`${path}.type must be "single" or "tile".`);
  }
  if (type === 'tile' && hasPosition) {
    throw new Error(`${path} cannot be combined with position.`);
  }
  const runtimeLayout = layout as {
    gapX?: number | string;
    gapY?: number | string;
    offsetX?: number | string;
    offsetY?: number | string;
    stagger?: boolean;
  };
  validateLayoutValue(runtimeLayout.gapX, `${path}.gapX`, true);
  validateLayoutValue(runtimeLayout.gapY, `${path}.gapY`, true);
  validateLayoutValue(runtimeLayout.offsetX, `${path}.offsetX`, false);
  validateLayoutValue(runtimeLayout.offsetY, `${path}.offsetY`, false);
  if (
    runtimeLayout.stagger !== undefined &&
    typeof runtimeLayout.stagger !== 'boolean'
  ) {
    throw new Error(`${path}.stagger must be a boolean.`);
  }
}

function validateTextOptions(options: TextOptions, path: string): void {
  if (
    Object.prototype.hasOwnProperty.call(
      options as TextOptions & Record<string, unknown>,
      'positionOptions'
    )
  ) {
    throw new Error(
      `${path}.positionOptions was removed in v2; use position instead.`
    );
  }
  validateAlpha(options, path);
  validateBlendMode(options.blendMode, path);
  const fontFallbacks = options.style?.fontFallbacks;
  if (
    fontFallbacks !== undefined &&
    (!Array.isArray(fontFallbacks) ||
      fontFallbacks.some(
        (font) => typeof font !== 'string' || font.trim().length === 0
      ))
  ) {
    throw new Error(
      `${path}.style.fontFallbacks must contain non-empty font family names.`
    );
  }
  const style = options.style;
  if (style?.maxWidth !== undefined) {
    validateLayoutValue(style.maxWidth, `${path}.style.maxWidth`, true);
    if (Number.parseFloat(String(style.maxWidth)) <= 0) {
      throw new Error(`${path}.style.maxWidth must be greater than zero.`);
    }
  }
  if (
    style?.lineHeight !== undefined &&
    (!Number.isFinite(style.lineHeight) || style.lineHeight <= 0)
  ) {
    throw new Error(
      `${path}.style.lineHeight must be a finite number greater than zero.`
    );
  }
  if (
    style?.letterSpacing !== undefined &&
    !Number.isFinite(style.letterSpacing)
  ) {
    throw new Error(`${path}.style.letterSpacing must be a finite number.`);
  }
  if (
    style?.maxLines !== undefined &&
    (!Number.isFinite(style.maxLines) ||
      !Number.isInteger(style.maxLines) ||
      style.maxLines < 1)
  ) {
    throw new Error(`${path}.style.maxLines must be a positive integer.`);
  }
  if (
    style?.direction !== undefined &&
    !['auto', 'ltr', 'rtl'].includes(style.direction)
  ) {
    throw new Error(`${path}.style.direction must be "auto", "ltr", or "rtl".`);
  }
  if (
    style?.wrap !== undefined &&
    !['word', 'character', 'none'].includes(style.wrap)
  ) {
    throw new Error(
      `${path}.style.wrap must be "word", "character", or "none".`
    );
  }
  if (
    style?.overflow !== undefined &&
    !['clip', 'ellipsis'].includes(style.overflow)
  ) {
    throw new Error(`${path}.style.overflow must be "clip" or "ellipsis".`);
  }
  const strokeStyle = options.style?.strokeStyle;
  if (strokeStyle) {
    if (!Number.isFinite(strokeStyle.width) || strokeStyle.width < 0) {
      throw new Error(
        `${path}.style.strokeStyle.width must be a non-negative finite number.`
      );
    }
    if (typeof strokeStyle.color !== 'string' || !strokeStyle.color.trim()) {
      throw new Error(
        `${path}.style.strokeStyle.color must be a non-empty string.`
      );
    }
  }
  validateWatermarkLayout(
    options.layout,
    options.position !== undefined,
    `${path}.layout`
  );
}

function validateImageOptions(
  options: WatermarkImageOptions,
  path: string,
  hasExternalPosition = false
): void {
  validateAlpha(options, path);
  validateBlendMode(options.blendMode, path);
  validateWatermarkLayout(
    options.layout,
    options.position !== undefined || hasExternalPosition,
    `${path}.layout`
  );
}
export function validateTextMarkOptions(options: TextMarkOptions): void {
  validateCommonOptions(options);
  options.watermarkTexts.forEach((textOptions, index) => {
    validateTextOptions(textOptions, `watermarkTexts[${index}]`);
  });
}

export function validateImageMarkOptions(options: ImageMarkOptions): void {
  validateCommonOptions(options);
  if (
    Object.prototype.hasOwnProperty.call(options, 'watermarkImage') ||
    Object.prototype.hasOwnProperty.call(options, 'watermarkPositions')
  ) {
    throw new Error(
      'watermarkImage and watermarkPositions were removed in v2; use watermarkImages[].position.'
    );
  }
  options.watermarkImages?.forEach((imageOptions, index) => {
    validateImageOptions(imageOptions, `watermarkImages[${index}]`);
  });
}

export function validateMarkOptions(options: MarkOptions): void {
  validateCommonOptions(options);
  if (
    Object.prototype.hasOwnProperty.call(options, 'watermarkImage') ||
    Object.prototype.hasOwnProperty.call(options, 'watermarkPositions')
  ) {
    throw new Error(
      'watermarkImage and watermarkPositions were removed in v2; use watermarks with an image layer.'
    );
  }
  options.watermarkImages?.forEach((imageOptions, index) => {
    validateImageOptions(imageOptions, `watermarkImages[${index}]`);
  });
  options.watermarks?.forEach((layer, index) => {
    if (layer.type === 'image') {
      validateImageOptions(layer, `watermarks[${index}]`);
    } else {
      validateTextOptions(layer, `watermarks[${index}]`);
    }
  });
  options.watermarkTexts?.forEach((textOptions, index) => {
    validateTextOptions(textOptions, `watermarkTexts[${index}]`);
  });
}
