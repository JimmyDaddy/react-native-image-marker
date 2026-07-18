import { Image } from 'react-native';
import type {
  CornerRadius,
  ImageMarkOptions,
  ImageOptions,
  ImageWatermarkLayer,
  MarkOptions,
  PositionOptions,
  TextBackgroundStyle,
  TextMarkOptions,
  TextOptions,
  TextStyle,
  TextWatermarkLayer,
  WatermarkImageOptions,
  WatermarkLayer,
} from './index';

export const DEFAULT_MAX_SIZE = 2048;

type AssetResolver = (source: any) => any;
type OutputOptions = Pick<
  MarkOptions,
  | 'quality'
  | 'filename'
  | 'saveFormat'
  | 'matteColor'
  | 'rotationCanvasMode'
  | 'maxSize'
>;

const defaultAssetResolver: AssetResolver = (source) =>
  Image.resolveAssetSource(source);

function clonePositionOptions(
  position?: PositionOptions
): PositionOptions | undefined {
  return position ? { ...position } : position;
}

function cloneCornerRadius(
  cornerRadius?: CornerRadius
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
  style?: TextBackgroundStyle | null
): TextBackgroundStyle | null | undefined {
  if (!style) {
    return style;
  }

  return {
    ...style,
    cornerRadius: cloneCornerRadius(style.cornerRadius),
  };
}

function cloneTextStyle(style?: TextStyle): TextStyle | undefined {
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

function cloneTextWatermarks(watermarkTexts: TextOptions[]): TextOptions[] {
  return watermarkTexts.map((textOptions) => ({
    ...textOptions,
    position: clonePositionOptions(textOptions.position),
    positionOptions: clonePositionOptions(textOptions.positionOptions),
    style: cloneTextStyle(textOptions.style),
  }));
}

function cloneImageOptions<T extends ImageOptions | undefined>(
  imageOptions: T
): T {
  return imageOptions ? ({ ...imageOptions } as T) : imageOptions;
}

function cloneImageWatermarks(
  watermarkImages: WatermarkImageOptions[]
): WatermarkImageOptions[] {
  return watermarkImages.map((imageOptions) => ({
    ...imageOptions,
    position: clonePositionOptions(imageOptions.position),
  }));
}

function getOutputOptions(options: MarkOptions): OutputOptions {
  const outputOptions: OutputOptions = {};

  if (options.quality !== undefined) {
    outputOptions.quality = options.quality;
  }
  if (options.filename !== undefined) {
    outputOptions.filename = options.filename;
  }
  if (options.saveFormat !== undefined) {
    outputOptions.saveFormat = options.saveFormat;
  }
  if (options.matteColor !== undefined) {
    outputOptions.matteColor = options.matteColor;
  }
  if (options.rotationCanvasMode !== undefined) {
    outputOptions.rotationCanvasMode = options.rotationCanvasMode;
  }
  outputOptions.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;

  return outputOptions;
}

function resolveImageSource(src: any, assetResolver: AssetResolver) {
  let srcObj: any = assetResolver(src);
  if (!srcObj) {
    srcObj = {
      uri: src,
      __packager_asset: false,
    };
  }
  return srcObj;
}

function resolveImageOptions<T extends ImageOptions>(
  imageOptions: T,
  assetResolver: AssetResolver
): T {
  return {
    ...imageOptions,
    src: resolveImageSource(imageOptions.src, assetResolver),
  };
}

function createTextLayer(textOptions: TextOptions): TextWatermarkLayer {
  return {
    ...textOptions,
    type: 'text',
    position:
      clonePositionOptions(
        textOptions.position || textOptions.positionOptions
      ) || {},
    style: cloneTextStyle(textOptions.style),
  };
}

function createImageLayer(
  imageOptions: WatermarkImageOptions,
  assetResolver: AssetResolver
): ImageWatermarkLayer {
  return {
    ...imageOptions,
    type: 'image',
    src: resolveImageSource(imageOptions.src, assetResolver),
    position: clonePositionOptions(imageOptions.position) || {},
  };
}

function createWatermarkLayers(
  options: MarkOptions,
  assetResolver: AssetResolver
): WatermarkLayer[] {
  if ((options.watermarks?.length ?? 0) > 0) {
    return options.watermarks!.map((layer) => {
      if (layer.type === 'text') {
        return createTextLayer(layer);
      }
      return createImageLayer(layer, assetResolver);
    });
  }

  const layers: WatermarkLayer[] = [
    ...cloneTextWatermarks(options.watermarkTexts ?? []).map(createTextLayer),
    ...cloneImageWatermarks(options.watermarkImages ?? []).map((imageOptions) =>
      createImageLayer(imageOptions, assetResolver)
    ),
  ];

  if (options.watermarkImage?.src) {
    layers.push(
      createImageLayer(
        {
          ...cloneImageOptions(options.watermarkImage),
          position: clonePositionOptions(options.watermarkPositions),
        },
        assetResolver
      )
    );
  }

  return layers;
}

export function normalizeTextMarkOptions(
  options: TextMarkOptions,
  assetResolver: AssetResolver = defaultAssetResolver
): TextMarkOptions {
  return {
    ...options,
    backgroundImage: resolveImageOptions(
      options.backgroundImage,
      assetResolver
    ),
    watermarkTexts: cloneTextWatermarks(options.watermarkTexts).map(
      (textOptions) => {
        const nativeTextOptions = { ...textOptions };
        delete nativeTextOptions.positionOptions;
        return {
          ...nativeTextOptions,
          position: textOptions.position || textOptions.positionOptions,
        };
      }
    ),
    maxSize: options.maxSize ?? DEFAULT_MAX_SIZE,
  };
}

export function normalizeImageMarkOptions(
  options: ImageMarkOptions,
  assetResolver: AssetResolver = defaultAssetResolver
): ImageMarkOptions {
  const nativeOptions: ImageMarkOptions = {
    ...options,
    backgroundImage: resolveImageOptions(
      options.backgroundImage,
      assetResolver
    ),
    watermarkImages: cloneImageWatermarks(options.watermarkImages ?? []).map(
      (imageOptions) => resolveImageOptions(imageOptions, assetResolver)
    ),
    maxSize: options.maxSize ?? DEFAULT_MAX_SIZE,
  };

  if (options.watermarkImage?.src) {
    nativeOptions.watermarkImage = resolveImageOptions(
      options.watermarkImage,
      assetResolver
    );
  } else {
    delete nativeOptions.watermarkImage;
  }

  if (options.watermarkPositions) {
    nativeOptions.watermarkPositions = clonePositionOptions(
      options.watermarkPositions
    );
  } else {
    delete nativeOptions.watermarkPositions;
  }

  return nativeOptions;
}

export function createNativeMarkOptions(
  options: MarkOptions,
  assetResolver: AssetResolver = defaultAssetResolver
): MarkOptions {
  return {
    backgroundImage: resolveImageOptions(
      options.backgroundImage,
      assetResolver
    ),
    watermarks: createWatermarkLayers(options, assetResolver),
    ...getOutputOptions(options),
  };
}
