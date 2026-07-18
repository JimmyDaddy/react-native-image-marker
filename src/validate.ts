import type {
  ImageMarkOptions,
  ImageOptions,
  MarkOptions,
  TextOptions,
  TextMarkOptions,
} from './index';

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
  imageOptions: ImageOptions | undefined,
  path: string
): void {
  const alpha = imageOptions?.alpha;

  if (
    alpha !== undefined &&
    (!Number.isFinite(alpha) || alpha < 0 || alpha > 1)
  ) {
    throw new Error(`${path}.alpha must be a finite number between 0 and 1.`);
  }
}

function validateCommonOptions(options: MarkRequestOptions): void {
  validateQuality(options);
  validateMaxSize(options);
  validateAlpha(options.backgroundImage, 'backgroundImage');
}

function validateTextOptions(textOptions: TextOptions, path: string): void {
  const strokeStyle = textOptions.style?.strokeStyle;
  if (!strokeStyle) {
    return;
  }
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

export function validateTextMarkOptions(options: TextMarkOptions): void {
  validateCommonOptions(options);
  options.watermarkTexts.forEach((textOptions, index) => {
    validateTextOptions(textOptions, `watermarkTexts[${index}]`);
  });
}

export function validateImageMarkOptions(options: ImageMarkOptions): void {
  validateCommonOptions(options);
  validateAlpha(options.watermarkImage, 'watermarkImage');
  options.watermarkImages?.forEach((imageOptions, index) => {
    validateAlpha(imageOptions, `watermarkImages[${index}]`);
  });
}

export function validateMarkOptions(options: MarkOptions): void {
  validateCommonOptions(options);
  validateAlpha(options.watermarkImage, 'watermarkImage');
  options.watermarkImages?.forEach((imageOptions, index) => {
    validateAlpha(imageOptions, `watermarkImages[${index}]`);
  });
  options.watermarks?.forEach((layer, index) => {
    if (layer.type === 'image') {
      validateAlpha(layer, `watermarks[${index}]`);
    } else {
      validateTextOptions(layer, `watermarks[${index}]`);
    }
  });
  options.watermarkTexts?.forEach((textOptions, index) => {
    validateTextOptions(textOptions, `watermarkTexts[${index}]`);
  });
}
