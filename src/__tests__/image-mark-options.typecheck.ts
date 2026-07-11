import Marker, { type ImageMarkOptions } from '../index';

// The deprecated single-watermark shape remains source-compatible for users
// that have not migrated to watermarkImages yet.
export const legacyWatermarkOnly: ImageMarkOptions = {
  backgroundImage: {
    src: 'file:///tmp/background.png',
  },
  watermarkImage: {
    src: 'file:///tmp/watermark.png',
  },
};

export const multipleWatermarks: ImageMarkOptions = {
  backgroundImage: {
    src: 'file:///tmp/background.png',
  },
  watermarkImages: [
    {
      src: 'file:///tmp/watermark.png',
    },
  ],
};

export function markWithLegacyWatermarkOnly(): Promise<string> {
  return Marker.markImage(legacyWatermarkOnly);
}
