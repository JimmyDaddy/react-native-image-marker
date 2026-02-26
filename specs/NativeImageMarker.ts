import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// CODEGEN SPEC: Use string literal union types for native compatibility
// These types use camelCase to match native implementation expectations
// The actual enums exported to users are defined in src/types/index.ts

// Position type for text watermark and image watermark
// Uses camelCase to match iOS/Android native code expectations
export type Position =
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'bottomRight'
  | 'center';

// TextBackgroundType for text watermark background styling
// Uses camelCase to match iOS/Android native code expectations
export type TextBackgroundType = 'stretchX' | 'stretchY' | 'fit';

// ImageFormat for save image format
// Uses camelCase to match iOS/Android native code expectations
export type ImageFormat = 'png' | 'jpg' | 'base64';

// Position options interface
export interface PositionOptions {
  X?: number | string;
  Y?: number | string;
  position?: Position;
}

// Padding interface for text background
export interface Padding {
  padding?: number | string;
  paddingLeft?: number | string;
  paddingRight?: number | string;
  paddingTop?: number | string;
  paddingBottom?: number | string;
  paddingHorizontal?: number | string;
  paddingVertical?: number | string;
  paddingX?: number | string;
  paddingY?: number | string;
}

// Shadow layer style interface
export interface ShadowLayerStyle {
  dx: number;
  dy: number;
  radius: number;
  color: string;
}

// Radius value interface
export interface RadiusValue {
  x: number | string;
  y: number | string;
}

// Corner radius interface
export interface CornerRadius {
  topLeft?: RadiusValue;
  topRight?: RadiusValue;
  bottomLeft?: RadiusValue;
  bottomRight?: RadiusValue;
  all?: RadiusValue;
}

// Text background style interface
export interface TextBackgroundStyle extends Padding {
  type?: TextBackgroundType | null;
  color: string;
  cornerRadius?: CornerRadius;
}

// Text style interface
export interface TextStyle {
  color?: string;
  fontName?: string;
  fontSize?: number;
  shadowStyle?: ShadowLayerStyle | null;
  textBackgroundStyle?: TextBackgroundStyle | null;
  underline?: boolean;
  skewX?: number;
  strikeThrough?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  italic?: boolean;
  bold?: boolean;
  rotate?: number;
}

// Text options interface
export interface TextOptions {
  text: string;
  positionOptions?: PositionOptions;
  position?: PositionOptions;
  style?: TextStyle;
}

// Image options interface
export interface ImageOptions {
  src: Object; // Codegen uses Object for complex types
  scale?: number;
  rotate?: number;
  alpha?: number;
}

// Watermark image options interface
export interface WatermarkImageOptions extends ImageOptions {
  position?: PositionOptions;
}

// Text mark options interface
export interface TextMarkOptions {
  backgroundImage: ImageOptions;
  watermarkTexts: TextOptions[];
  quality?: number;
  filename?: string;
  saveFormat?: ImageFormat;
  maxSize?: number;
}

// Image mark options interface
export interface ImageMarkOptions {
  backgroundImage: ImageOptions;
  watermarkImage?: ImageOptions;
  watermarkPositions?: PositionOptions;
  quality?: number;
  filename?: string;
  saveFormat?: ImageFormat;
  maxSize?: number;
  watermarkImages: WatermarkImageOptions[];
}

export interface Spec extends TurboModule {
  markWithText(options: TextMarkOptions): Promise<string>;
  markWithImage(options: ImageMarkOptions): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ImageMarker');
