import Marker, {
  type ImageMarkOptions,
  type TextMarkOptions,
  type TextStrokeStyle,
} from '../index';

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

export const textStroke: TextStrokeStyle = {
  color: '#00000099',
  width: 2,
};

export const outlinedText: TextMarkOptions = {
  backgroundImage: { src: 'file:///tmp/background.png' },
  watermarkTexts: [
    {
      text: 'Outlined',
      style: { color: '#FFFFFF', strokeStyle: textStroke },
    },
  ],
};
