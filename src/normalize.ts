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
  WatermarkLayout,
  WatermarkLayer,
} from './index';
import type {
  DetectInvisibleWatermarkOptions,
  EmbedInvisibleWatermarkOptions,
} from './invisible-watermark';
import type {
  NativeCornerRadius,
  NativeImageOptions,
  NativeImageMarkOptions,
  NativeImageSource,
  NativeInvisibleWatermarkOptions,
  NativeMarkOptions,
  NativePositionOptions,
  NativeTextBackgroundStyle,
  NativeTextMarkOptions,
  NativeTextStyle,
  NativeWatermarkLayout,
  NativeWatermarkLayer,
} from './NativeImageMarker';

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

function omitUndefined<Value extends object>(value: Value): Value {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  ) as Value;
}

function clonePositionOptions(
  position?: PositionOptions
): PositionOptions | undefined {
  return position ? { ...position } : position;
}

function cloneWatermarkLayout(
  layout?: WatermarkLayout
): WatermarkLayout | undefined {
  return layout ? { ...layout } : layout;
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

function cloneTextWatermarks(watermarkTexts: TextOptions[]): TextOptions[] {
  return watermarkTexts.map((textOptions) => {
    const cloned: TextOptions = {
      ...textOptions,
      layout: cloneWatermarkLayout(textOptions.layout),
      style: cloneTextStyle(textOptions.style),
    };
    const position = clonePositionOptions(textOptions.position);
    if (position) cloned.position = position;
    else delete cloned.position;
    return cloned;
  });
}

function cloneImageWatermarks(
  watermarkImages: WatermarkImageOptions[]
): WatermarkImageOptions[] {
  return watermarkImages.map((imageOptions) => {
    const cloned: WatermarkImageOptions = {
      ...imageOptions,
      layout: cloneWatermarkLayout(imageOptions.layout),
    };
    const position = clonePositionOptions(imageOptions.position);
    if (position) cloned.position = position;
    else delete cloned.position;
    return cloned;
  });
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
  if (src && typeof src === 'object' && typeof src.uri === 'string') {
    return src;
  }
  let srcObj: any = assetResolver(src);
  if (!srcObj) {
    srcObj = {
      uri: src,
      __packager_asset: false,
    };
  }
  return srcObj;
}

function toNativeImageSource(source: any): NativeImageSource {
  const result: {
    uri: string;
    width?: number;
    height?: number;
    scale?: number;
  } = { uri: String(source?.uri ?? '') };
  if (typeof source?.width === 'number') result.width = source.width;
  if (typeof source?.height === 'number') result.height = source.height;
  if (typeof source?.scale === 'number') result.scale = source.scale;
  return omitUndefined(result);
}

function toNativeImageOptions(
  imageOptions: ImageOptions,
  assetResolver: AssetResolver
): NativeImageOptions {
  const resolvedSource = resolveImageSource(imageOptions.src, assetResolver);
  const result: {
    src: NativeImageSource;
    scale?: number;
    rotate?: number;
    alpha?: number;
  } = { src: toNativeImageSource(resolvedSource) };
  if (imageOptions.scale !== undefined) result.scale = imageOptions.scale;
  if (imageOptions.rotate !== undefined) result.rotate = imageOptions.rotate;
  if (imageOptions.alpha !== undefined) result.alpha = imageOptions.alpha;
  return omitUndefined(result);
}

function nativeMeasure(value: number | string | undefined): string | undefined {
  return value === undefined ? undefined : String(value);
}

function toNativePosition(
  position: PositionOptions | undefined
): NativePositionOptions | undefined {
  if (!position) return undefined;
  const result: {
    X?: string;
    Y?: string;
    edgeInset?: string;
    position?: string;
  } = {};
  const x = nativeMeasure(position.X);
  const y = nativeMeasure(position.Y);
  const edgeInset = nativeMeasure(position.edgeInset);
  if (x !== undefined) result.X = x;
  if (y !== undefined) result.Y = y;
  if (edgeInset !== undefined) result.edgeInset = edgeInset;
  if (position.position !== undefined) result.position = position.position;
  return result;
}

function toNativeLayout(
  layout: WatermarkLayout | undefined
): NativeWatermarkLayout | undefined {
  if (!layout) return undefined;
  const result: {
    type?: string;
    gapX?: string;
    gapY?: string;
    offsetX?: string;
    offsetY?: string;
    stagger?: boolean;
  } = { type: layout.type ?? 'single' };
  if (layout.type === 'tile') {
    const gapX = nativeMeasure(layout.gapX);
    const gapY = nativeMeasure(layout.gapY);
    const offsetX = nativeMeasure(layout.offsetX);
    const offsetY = nativeMeasure(layout.offsetY);
    if (gapX !== undefined) result.gapX = gapX;
    if (gapY !== undefined) result.gapY = gapY;
    if (offsetX !== undefined) result.offsetX = offsetX;
    if (offsetY !== undefined) result.offsetY = offsetY;
    if (layout.stagger !== undefined) result.stagger = layout.stagger;
  }
  return result;
}

function toNativeCornerRadius(
  cornerRadius: CornerRadius | undefined
): NativeCornerRadius | undefined {
  if (!cornerRadius) return undefined;
  const convert = (value: CornerRadius['all']) =>
    value ? { x: String(value.x), y: String(value.y) } : undefined;
  return omitUndefined({
    topLeft: convert(cornerRadius.topLeft),
    topRight: convert(cornerRadius.topRight),
    bottomLeft: convert(cornerRadius.bottomLeft),
    bottomRight: convert(cornerRadius.bottomRight),
    all: convert(cornerRadius.all),
  });
}

function toNativeTextBackgroundStyle(
  style: TextBackgroundStyle | null | undefined
): NativeTextBackgroundStyle | undefined {
  if (!style) return undefined;
  const result: Record<string, string | NativeCornerRadius | undefined> = {
    color: style.color,
    type: style.type ?? undefined,
    cornerRadius: toNativeCornerRadius(style.cornerRadius),
  };
  const paddingKeys = [
    'padding',
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'paddingBottom',
    'paddingHorizontal',
    'paddingVertical',
    'paddingX',
    'paddingY',
  ] as const;
  paddingKeys.forEach((key) => {
    const value = nativeMeasure(style[key]);
    if (value !== undefined) result[key] = value;
  });
  return omitUndefined(result) as NativeTextBackgroundStyle;
}

function toNativeTextStyle(
  style: TextStyle | undefined
): NativeTextStyle | undefined {
  if (!style) return undefined;
  return omitUndefined({
    color: style.color,
    fontName: style.fontName,
    fontFallbacks: style.fontFallbacks ? [...style.fontFallbacks] : undefined,
    fontSize: style.fontSize,
    fontSizeRatio: style.fontSizeRatio,
    shadowStyle: style.shadowStyle ?? undefined,
    textBackgroundStyle: toNativeTextBackgroundStyle(style.textBackgroundStyle),
    strokeStyle: style.strokeStyle ?? undefined,
    underline: style.underline,
    skewX: style.skewX,
    strikeThrough: style.strikeThrough,
    textAlign: style.textAlign,
    italic: style.italic,
    bold: style.bold,
    rotate: style.rotate,
  });
}

function toNativeLayer(
  layer: WatermarkLayer,
  assetResolver: AssetResolver
): NativeWatermarkLayer {
  if (layer.type === 'text') {
    return omitUndefined({
      type: 'text',
      text: layer.text,
      alpha: layer.alpha,
      blendMode: layer.blendMode,
      position: toNativePosition(layer.position),
      layout: toNativeLayout(layer.layout),
      style: toNativeTextStyle(layer.style),
    });
  }
  const image = toNativeImageOptions(layer, assetResolver);
  return omitUndefined({
    type: 'image',
    src: image.src,
    scale: image.scale,
    rotate: image.rotate,
    alpha: image.alpha,
    blendMode: layer.blendMode,
    position: toNativePosition(layer.position),
    layout: toNativeLayout(layer.layout),
    trimTransparentPadding: layer.trimTransparentPadding,
  });
}

function createTextLayer(textOptions: TextOptions): TextWatermarkLayer {
  const layer: TextWatermarkLayer = {
    ...textOptions,
    type: 'text',
    layout: cloneWatermarkLayout(textOptions.layout),
    style: cloneTextStyle(textOptions.style),
  };
  const position = clonePositionOptions(textOptions.position);
  if (position) {
    layer.position = position;
  } else {
    delete layer.position;
  }
  return layer;
}

function createImageLayer(
  imageOptions: WatermarkImageOptions,
  assetResolver: AssetResolver
): ImageWatermarkLayer {
  const layer: ImageWatermarkLayer = {
    ...imageOptions,
    type: 'image',
    src: resolveImageSource(imageOptions.src, assetResolver),
    layout: cloneWatermarkLayout(imageOptions.layout),
  };
  const position = clonePositionOptions(imageOptions.position);
  if (position) {
    layer.position = position;
  } else {
    delete layer.position;
  }
  return layer;
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

  return layers;
}

export function normalizeTextMarkOptions(
  options: TextMarkOptions,
  assetResolver: AssetResolver = defaultAssetResolver
): Omit<NativeTextMarkOptions, 'jobId'> {
  const output = getOutputOptions(options as MarkOptions);
  return {
    backgroundImage: toNativeImageOptions(
      options.backgroundImage,
      assetResolver
    ),
    watermarkTexts: cloneTextWatermarks(options.watermarkTexts).map(
      (textOptions) =>
        toNativeLayer(createTextLayer(textOptions), assetResolver)
    ),
    ...output,
  };
}

export function normalizeImageMarkOptions(
  options: ImageMarkOptions,
  assetResolver: AssetResolver = defaultAssetResolver
): Omit<NativeImageMarkOptions, 'jobId'> {
  const output = getOutputOptions(options as MarkOptions);
  const nativeOptions: {
    backgroundImage: NativeImageOptions;
    watermarkImages: NativeWatermarkLayer[];
    quality?: number;
    filename?: string;
    saveFormat?: string;
    matteColor?: string;
    rotationCanvasMode?: string;
    maxSize?: number;
  } = {
    backgroundImage: toNativeImageOptions(
      options.backgroundImage,
      assetResolver
    ),
    watermarkImages: cloneImageWatermarks(options.watermarkImages ?? []).map(
      (imageOptions) =>
        toNativeLayer(
          createImageLayer(imageOptions, assetResolver),
          assetResolver
        )
    ),
    ...output,
  };

  return nativeOptions;
}

export function createNativeMarkOptions(
  options: MarkOptions,
  assetResolver: AssetResolver = defaultAssetResolver
): Omit<NativeMarkOptions, 'jobId'> {
  const output = getOutputOptions(options);
  return {
    backgroundImage: toNativeImageOptions(
      options.backgroundImage,
      assetResolver
    ),
    watermarks: createWatermarkLayers(options, assetResolver).map((layer) =>
      toNativeLayer(layer, assetResolver)
    ),
    ...output,
  };
}

export function createNativeEmbedInvisibleOptions(
  options: EmbedInvisibleWatermarkOptions,
  assetResolver: AssetResolver = defaultAssetResolver
): Omit<NativeInvisibleWatermarkOptions, 'jobId'> {
  const { image, ...rest } = options;
  return {
    ...rest,
    backgroundImage: toNativeImageOptions(image, assetResolver),
    maxSize: options.maxSize ?? DEFAULT_MAX_SIZE,
  };
}

export function createNativeDetectInvisibleOptions(
  options: DetectInvisibleWatermarkOptions,
  assetResolver: AssetResolver = defaultAssetResolver
): Omit<NativeInvisibleWatermarkOptions, 'jobId'> {
  const { image, ...rest } = options;
  delete rest.worker;
  return {
    ...rest,
    backgroundImage: toNativeImageOptions(image, assetResolver),
    maxSize: options.maxSize ?? DEFAULT_MAX_SIZE,
  };
}
