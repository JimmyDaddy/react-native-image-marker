import sharp from 'sharp';

export const DEFAULT_MAX_INPUT_PIXELS = 40_000_000;

/**
 * @param {{maxInputPixels?: number}} [options]
 */
export function createSharpCodec({
  maxInputPixels = DEFAULT_MAX_INPUT_PIXELS,
} = {}) {
  if (!Number.isInteger(maxInputPixels) || maxInputPixels <= 0) {
    throw new Error('maxInputPixels must be a positive integer.');
  }

  return {
    /** @param {Buffer | Uint8Array} source @param {{maxSize: number}} options */
    async decode(source, { maxSize }) {
      const { data, info } = await sharp(source, {
        animated: false,
        failOn: 'error',
        limitInputPixels: maxInputPixels,
      })
        .rotate()
        .resize({
          width: maxSize,
          height: maxSize,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      if (info.channels !== 4) {
        throw new Error('sharp did not return four-channel RGBA pixels.');
      }
      return { data, width: info.width, height: info.height };
    },

    /**
     * @param {{data: Uint8Array | Uint8ClampedArray, width: number, height: number}} image
     * @param {{format: 'jpeg' | 'png', quality: number}} options
     */
    async encode(image, options) {
      const pipeline = sharp(Buffer.from(image.data), {
        raw: { width: image.width, height: image.height, channels: 4 },
      });
      return options.format === 'png'
        ? pipeline.png().toBuffer()
        : pipeline.jpeg({ quality: options.quality }).toBuffer();
    },
  };
}
