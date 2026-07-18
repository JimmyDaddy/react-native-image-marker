import Marker, {
  type BlendMode,
  ImageFormat,
  type ImageMarkOptions,
  type TextMarkOptions,
  type TextStrokeStyle,
  type WatermarkLayout,
  type WatermarkRecipe,
} from '../index';

export const photographicBlendMode: BlendMode = 'overlay';

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

export const tiledLayout: WatermarkLayout = {
  type: 'tile',
  gapX: '8%',
  gapY: 24,
  offsetX: '-2.5%',
  stagger: true,
};

export const tiledText: TextMarkOptions = {
  backgroundImage: { src: 'file:///tmp/background.png' },
  watermarkTexts: [{ text: 'CONFIDENTIAL', layout: tiledLayout }],
};

export const reusableRecipe: WatermarkRecipe = Marker.createRecipe({
  schemaVersion: 1,
  watermarks: [
    {
      type: 'text',
      text: '{{label}} #{{index}}',
      blendMode: photographicBlendMode,
      visibleWhen: { variable: 'showLabel', equals: true },
    },
    {
      type: 'image',
      src: 'file:///tmp/logo.png',
      blendMode: 'multiply',
    },
  ],
  saveFormat: ImageFormat.jpg,
});

export const reusableBlobRecipe: WatermarkRecipe<Blob> = Marker.createRecipe(
  {
    watermarks: [{ type: 'text', text: 'Reusable Web bytes' }],
    saveFormat: ImageFormat.png,
  },
  { resultType: 'blob' }
);

export const recipeBatch = reusableRecipe.applyMany(
  [
    {
      backgroundImage: { src: 'file:///tmp/one.jpg' },
      filename: 'one',
      variables: { label: 'ONE', showLabel: true },
    },
    {
      backgroundImage: { src: 'file:///tmp/two.jpg' },
      filename: 'two',
      variables: { label: 'TWO', showLabel: false },
    },
  ],
  {
    concurrency: 2,
    onProgress(progress) {
      const settled: number = progress.settled;
      settled.toFixed(0);
    },
  }
);
