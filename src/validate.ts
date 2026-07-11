import type {
  ImageMarkOptions,
  ImageOptions,
  MarkOptions,
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

export function validateTextMarkOptions(options: TextMarkOptions): void {
  validateCommonOptions(options);
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
    }
  });
}
