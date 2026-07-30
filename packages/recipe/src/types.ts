export const WATERMARK_RECIPE_SCHEMA_VERSION = 2 as const;

export type WatermarkRecipeSchemaVersion =
  typeof WATERMARK_RECIPE_SCHEMA_VERSION;
export type WatermarkRecipeVariable = string | number | boolean;
export type WatermarkMeasure = number | string;
export type WatermarkPosition =
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'bottomRight'
  | 'center';
export type WatermarkBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten';
export type WatermarkImageFormat = 'jpg' | 'png' | 'webp' | 'base64';
export type WatermarkRotationCanvasMode = 'expand' | 'crop';
export type WatermarkTextDirection = 'auto' | 'ltr' | 'rtl';
export type WatermarkTextWrap = 'word' | 'character' | 'none';
export type WatermarkTextOverflow = 'clip' | 'ellipsis';

export interface WatermarkRecipeCondition {
  variable: string;
  equals: WatermarkRecipeVariable;
}

export interface WatermarkPositionOptions {
  X?: WatermarkMeasure;
  Y?: WatermarkMeasure;
  position?: WatermarkPosition;
  edgeInset?: WatermarkMeasure;
}

export type WatermarkLayout =
  | { type?: 'single' }
  | {
      type: 'tile';
      gapX?: WatermarkMeasure;
      gapY?: WatermarkMeasure;
      offsetX?: WatermarkMeasure;
      offsetY?: WatermarkMeasure;
      stagger?: boolean;
    };

export interface WatermarkRadiusValue {
  x: WatermarkMeasure;
  y: WatermarkMeasure;
}

export interface WatermarkCornerRadius {
  topLeft?: WatermarkRadiusValue;
  topRight?: WatermarkRadiusValue;
  bottomLeft?: WatermarkRadiusValue;
  bottomRight?: WatermarkRadiusValue;
  all?: WatermarkRadiusValue;
}

export interface WatermarkTextBackgroundStyle {
  type?: 'stretchX' | 'stretchY' | 'fit' | null;
  color: string;
  padding?: WatermarkMeasure;
  paddingLeft?: WatermarkMeasure;
  paddingRight?: WatermarkMeasure;
  paddingTop?: WatermarkMeasure;
  paddingBottom?: WatermarkMeasure;
  paddingHorizontal?: WatermarkMeasure;
  paddingVertical?: WatermarkMeasure;
  paddingX?: WatermarkMeasure;
  paddingY?: WatermarkMeasure;
  cornerRadius?: WatermarkCornerRadius;
}

export interface WatermarkTextStyle {
  color?: string;
  fontName?: string;
  fontFallbacks?: string[];
  fontSize?: number;
  fontSizeRatio?: number;
  maxWidth?: WatermarkMeasure;
  lineHeight?: number;
  letterSpacing?: number;
  direction?: WatermarkTextDirection;
  wrap?: WatermarkTextWrap;
  maxLines?: number;
  overflow?: WatermarkTextOverflow;
  shadowStyle?: {
    dx: number;
    dy: number;
    radius: number;
    color: string;
  } | null;
  textBackgroundStyle?: WatermarkTextBackgroundStyle | null;
  strokeStyle?: { color: string; width: number } | null;
  underline?: boolean;
  skewX?: number;
  strikeThrough?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  italic?: boolean;
  bold?: boolean;
  rotate?: number;
}

export interface WatermarkRecipeLayerFields {
  id?: string;
  name?: string;
  visible?: boolean;
  locked?: boolean;
  groupId?: string;
  visibleWhen?: WatermarkRecipeCondition;
}

export interface WatermarkTextLayer extends WatermarkRecipeLayerFields {
  type: 'text';
  text: string;
  alpha?: number;
  blendMode?: WatermarkBlendMode;
  position?: WatermarkPositionOptions;
  layout?: WatermarkLayout;
  style?: WatermarkTextStyle;
}

export interface WatermarkImageLayer<Source = unknown>
  extends WatermarkRecipeLayerFields {
  type: 'image';
  src: Source;
  scale?: number;
  rotate?: number;
  alpha?: number;
  blendMode?: WatermarkBlendMode;
  position?: WatermarkPositionOptions;
  layout?: WatermarkLayout;
  trimTransparentPadding?: boolean;
}

export type WatermarkRecipeLayer<Source = unknown> =
  | WatermarkTextLayer
  | WatermarkImageLayer<Source>;

export type WatermarkRecipeDefinitionLayer<Source = unknown> =
  WatermarkRecipeLayer<Source> & { id: string };

export interface WatermarkRecipeOutputOptions {
  quality?: number;
  saveFormat?: WatermarkImageFormat;
  matteColor?: string;
  rotationCanvasMode?: WatermarkRotationCanvasMode;
  maxSize?: number;
}

export interface WatermarkRecipeOptions<Source = unknown> {
  schemaVersion?: WatermarkRecipeSchemaVersion;
  layers: readonly WatermarkRecipeLayer<Source>[];
  output?: WatermarkRecipeOutputOptions;
}

export interface WatermarkRecipeDefinition<Source = unknown> {
  schemaVersion: WatermarkRecipeSchemaVersion;
  layers: WatermarkRecipeDefinitionLayer<Source>[];
  output: WatermarkRecipeOutputOptions;
}

export interface LegacyWatermarkRecipeDefinition<Source = unknown>
  extends WatermarkRecipeOutputOptions {
  schemaVersion: 1;
  watermarks: WatermarkRecipeLayer<Source>[];
}

export type WatermarkRecipeDocument<Source = unknown> =
  | WatermarkRecipeDefinition<Source>
  | LegacyWatermarkRecipeDefinition<Source>;

export interface WatermarkRecipeInput<Source = unknown> {
  backgroundImage: {
    src: Source;
    scale?: number;
    rotate?: number;
    alpha?: number;
  };
  filename?: string;
  variables?: Readonly<Record<string, WatermarkRecipeVariable>>;
}

export interface WatermarkRecipeVariableContext {
  filename?: string;
  index?: number;
  variables?: Readonly<Record<string, WatermarkRecipeVariable>>;
}

export interface WatermarkRecipeValidationSuccess<Source = unknown> {
  success: true;
  value: WatermarkRecipeDefinition<Source>;
}

export interface WatermarkRecipeValidationFailure {
  success: false;
  error: Error;
}

export type WatermarkRecipeValidationResult<Source = unknown> =
  | WatermarkRecipeValidationSuccess<Source>
  | WatermarkRecipeValidationFailure;
