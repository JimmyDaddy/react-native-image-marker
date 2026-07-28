import type { TurboModule } from 'react-native';
import type { Double } from 'react-native/Libraries/Types/CodegenTypes';
import { TurboModuleRegistry } from 'react-native';

/**
 * Codegen-only image source. Public React Native image sources are resolved
 * and reduced to this stable cross-platform payload before crossing the bridge.
 */
export type NativeImageSource = Readonly<{
  uri: string;
  width?: Double;
  height?: Double;
  scale?: Double;
}>;

export type NativeImageOptions = Readonly<{
  src: NativeImageSource;
  scale?: Double;
  rotate?: Double;
  alpha?: Double;
}>;

export type NativePositionOptions = Readonly<{
  X?: string;
  Y?: string;
  edgeInset?: string;
  position?: string;
}>;

export type NativeWatermarkLayout = Readonly<{
  type?: string;
  gapX?: string;
  gapY?: string;
  offsetX?: string;
  offsetY?: string;
  stagger?: boolean;
}>;

export type NativeRadiusValue = Readonly<{
  x: string;
  y: string;
}>;

export type NativeCornerRadius = Readonly<{
  topLeft?: NativeRadiusValue;
  topRight?: NativeRadiusValue;
  bottomLeft?: NativeRadiusValue;
  bottomRight?: NativeRadiusValue;
  all?: NativeRadiusValue;
}>;

export type NativeTextBackgroundStyle = Readonly<{
  type?: string;
  color: string;
  padding?: string;
  paddingLeft?: string;
  paddingRight?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingHorizontal?: string;
  paddingVertical?: string;
  paddingX?: string;
  paddingY?: string;
  cornerRadius?: NativeCornerRadius;
}>;

export type NativeShadowStyle = Readonly<{
  dx: Double;
  dy: Double;
  radius: Double;
  color: string;
}>;

export type NativeTextStrokeStyle = Readonly<{
  color: string;
  width: Double;
}>;

export type NativeTextStyle = Readonly<{
  color?: string;
  fontName?: string;
  fontFallbacks?: ReadonlyArray<string>;
  fontSize?: Double;
  fontSizeRatio?: Double;
  shadowStyle?: NativeShadowStyle;
  textBackgroundStyle?: NativeTextBackgroundStyle;
  strokeStyle?: NativeTextStrokeStyle;
  underline?: boolean;
  skewX?: Double;
  strikeThrough?: boolean;
  textAlign?: string;
  italic?: boolean;
  bold?: boolean;
  rotate?: Double;
}>;

/**
 * A single Codegen layer shape avoids bridge-only unions. `type` selects the
 * required text or image fields and native validation rejects invalid mixes.
 */
export type NativeWatermarkLayer = Readonly<{
  type: string;
  text?: string;
  src?: NativeImageSource;
  scale?: Double;
  rotate?: Double;
  alpha?: Double;
  blendMode?: string;
  position?: NativePositionOptions;
  layout?: NativeWatermarkLayout;
  style?: NativeTextStyle;
  trimTransparentPadding?: boolean;
}>;

export type NativeMarkOptions = Readonly<{
  backgroundImage: NativeImageOptions;
  watermarks: ReadonlyArray<NativeWatermarkLayer>;
  quality?: Double;
  filename?: string;
  saveFormat?: string;
  matteColor?: string;
  rotationCanvasMode?: string;
  maxSize?: Double;
  jobId: string;
}>;

export type NativeTextMarkOptions = Readonly<{
  backgroundImage: NativeImageOptions;
  watermarkTexts: ReadonlyArray<NativeWatermarkLayer>;
  quality?: Double;
  filename?: string;
  saveFormat?: string;
  matteColor?: string;
  rotationCanvasMode?: string;
  maxSize?: Double;
  jobId: string;
}>;

export type NativeImageMarkOptions = Readonly<{
  backgroundImage: NativeImageOptions;
  watermarkImages: ReadonlyArray<NativeWatermarkLayer>;
  quality?: Double;
  filename?: string;
  saveFormat?: string;
  matteColor?: string;
  rotationCanvasMode?: string;
  maxSize?: Double;
  jobId: string;
}>;

export type NativeInvisibleWatermarkOptions = Readonly<{
  backgroundImage: NativeImageOptions;
  payload?: string;
  key: string;
  strength?: string;
  search?: string;
  quality?: Double;
  filename?: string;
  saveFormat?: string;
  maxSize?: Double;
  jobId: string;
}>;

export interface Spec extends TurboModule {
  markWithText(options: NativeTextMarkOptions): Promise<string>;
  markWithImage(options: NativeImageMarkOptions): Promise<string>;
  markWithWatermarks(options: NativeMarkOptions): Promise<string>;
  embedInvisible(options: NativeInvisibleWatermarkOptions): Promise<string>;
  // JSON keeps the detector return compatible with older native bridges while
  // all input fields remain strongly typed through Codegen.
  detectInvisible(options: NativeInvisibleWatermarkOptions): Promise<string>;
  cancel(jobId: string): Promise<boolean>;
}

export default TurboModuleRegistry.get<Spec>('ImageMarker');
