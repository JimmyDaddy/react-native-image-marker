import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  type ImageSourcePropType,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Marker, {
  ImageFormat,
  Position,
  RotationCanvasMode,
  TextBackgroundType,
} from 'react-native-image-marker';
import Toast from 'react-native-toast-message';
import { filesize } from 'filesize';
import { inflate } from 'pako';
import {
  AppButton,
  ArchitecturePanel,
  type AppTab,
  ChipGroup,
  FeatureCard,
  Field,
  NumericField,
  type OffsetValue,
  PreviewPanel,
  Section,
  TabBar,
  ToggleRow,
} from './lab/components';

const { width } = Dimensions.get('window');

export type PickImageTarget = 'image' | 'mark';

type BackgroundFormat =
  | 'normal image'
  | 'base64'
  | 'rotated image'
  | 'picked image';
type WatermarkType = 'text' | 'image' | 'mixed';
type RunMode = 'anchorOffset' | 'absoluteXY';
type FeatureVariant = 'orientation' | 'base64';

export type ImageMarkerLabAssets = {
  icon: unknown;
  icon1: unknown;
  bg: unknown;
  base64Bg: unknown;
  orientationBg?: unknown;
};

export type ImageMarkerLabProps = {
  assets: ImageMarkerLabAssets;
  backgroundFormats: Exclude<BackgroundFormat, 'picked image'>[];
  featureVariant: FeatureVariant;
  pickImage: (target: PickImageTarget) => Promise<string | null>;
  getFileSize: (path: string) => Promise<number>;
  readFileBase64: (path: string) => Promise<string>;
  removeFile: (path: string) => Promise<void>;
};

type MarkerConfig = {
  image: unknown;
  marker: unknown;
  waterMarkType: WatermarkType;
  text: string;
  fontName: string;
  position: Position;
  X: OffsetValue;
  Y: OffsetValue;
  saveFormat: ImageFormat;
  useTextShadow: boolean;
  useTextBgStyle: boolean;
  textBgStretch: TextBackgroundType;
  underline: boolean;
  italic: boolean;
  bold: boolean;
  strikeThrough: boolean;
  textAlign: 'left' | 'right' | 'center';
  textRotate: number;
  backgroundScale: number;
  backgroundRotate: number;
  backgroundAlpha: number;
  watermarkScale: number;
  watermarkRotate: number;
  watermarkAlpha: number;
  quality: number;
  fontSize: number;
};

const watermarkTypes: WatermarkType[] = ['text', 'image', 'mixed'];
const saveFormats = [ImageFormat.png, ImageFormat.jpg, ImageFormat.base64];
const positions = [
  Position.topLeft,
  Position.topCenter,
  Position.topRight,
  Position.center,
  Position.bottomLeft,
  Position.bottomCenter,
  Position.bottomRight,
];
const textBgStretchOptions = [
  TextBackgroundType.none,
  TextBackgroundType.stretchX,
  TextBackgroundType.stretchY,
];
const textAlignOptions: MarkerConfig['textAlign'][] = [
  'left',
  'center',
  'right',
];
const exampleFontName = 'MaShanZheng-Regular';
const sharpWatermarkDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAA1klEQVR42u3aWw6DMAwEwNz/0u0RaGRn47YTiS8eiQbJYJa11np1bk/j6fjd/Q0bAAAADgLsAu2O6noAAABwtwh2n/91TwEAAIYBdE9YfTE6UPQAAABwsAhWFxQoegAAANgogulx4YYAAAAg2MwMvD4AAAAuNjMDmiUAAP4aIB1mdu8vh6sAAACI/qBQvV53+AoAAIC7zUi6WdouggAA/DhAOphIh58fzAcAAICL4eiA5gkAAADBCQeGrwAAADj4wWJ6uAoAAIDsi1A6/Cz/IAEAwG8DvAHibmyc3jWFggAAAABJRU5ErkJggg==';
const paddedWatermarkDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAS0lEQVR42u3SsQ0AIBADsey/dBAjAF8hu0kfXQIAAAAAAMeads/tfvHB4wkKUIACFKAABShAAQpQgAIUoAAFKEABClAAAAAAAACMWikxfZ9KwPGPAAAAAElFTkSuQmCC';
const asymmetricWatermarkDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAYAAABU1PscAAAAiklEQVR42mN47+LyfyCw0tE4qmCGUQ8MJg+AwGgMjHpg1AOjHhj1AEkeoJZBA4VHPTDqgVEPDHUPWDd9+08J/nVGlGqYX1yLZD2DzgOkemJQeoAUTwxaDxDriUHtAWI8QTMPYHMMuXjIewCfJ4aMB3B5YjQGaJ2JBywPDPlSaMTXA6NtodHWKJ0wAK4zu/VjvPaxAAAAAElFTkSuQmCC';
const solidWatermarkBackgroundDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAYAAABU1PscAAAAM0lEQVR42u3PMQ0AAAwDoPo33WrYuQQckD4XAQEBAQEBAQEBAQEBAQEBAQEBAQEBAYGrAX6h6VrZbbgHAAAAAElFTkSuQmCC';

const base64Alphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64Bytes(value: string) {
  const encoded = value.slice(value.indexOf(',') + 1).replace(/\s/g, '');
  if (encoded.length % 4 !== 0) {
    throw new Error('Invalid base64 output length');
  }

  const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
  const result = new Uint8Array((encoded.length / 4) * 3 - padding);
  let outputIndex = 0;
  for (let index = 0; index < encoded.length; index += 4) {
    const first = base64Alphabet.indexOf(encoded[index]);
    const second = base64Alphabet.indexOf(encoded[index + 1]);
    const third =
      encoded[index + 2] === '='
        ? 0
        : base64Alphabet.indexOf(encoded[index + 2]);
    const fourth =
      encoded[index + 3] === '='
        ? 0
        : base64Alphabet.indexOf(encoded[index + 3]);
    if (first < 0 || second < 0 || third < 0 || fourth < 0) {
      throw new Error('Invalid base64 output data');
    }

    const bits = first * 262144 + second * 4096 + third * 64 + fourth;
    if (outputIndex < result.length) {
      result[outputIndex++] = Math.floor(bits / 65536) % 256;
    }
    if (outputIndex < result.length) {
      result[outputIndex++] = Math.floor(bits / 256) % 256;
    }
    if (outputIndex < result.length) {
      result[outputIndex++] = bits % 256;
    }
  }
  return result;
}

function readBigEndianUint32(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] * 16777216 +
    bytes[offset + 1] * 65536 +
    bytes[offset + 2] * 256 +
    bytes[offset + 3]
  );
}

function paethPredictor(left: number, up: number, upperLeft: number) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) {
    return left;
  }
  return upDistance <= upperLeftDistance ? up : upperLeft;
}

function channelCountForPngColorType(colorType: number) {
  switch (colorType) {
    case 0:
      return 1;
    case 2:
      return 3;
    case 4:
      return 2;
    case 6:
      return 4;
    default:
      throw new Error(`Unsupported PNG color type ${colorType}`);
  }
}

function decodePngRgba(base64: string) {
  const bytes = decodeBase64Bytes(base64);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (signature.some((value, index) => bytes[index] !== value)) {
    throw new Error('Orientation probe output is not a PNG');
  }

  let offset = signature.length;
  let pngWidth = 0;
  let pngHeight = 0;
  let bitDepth = 0;
  let colorType = -1;
  let compressionMethod = -1;
  let filterMethod = -1;
  let interlaceMethod = -1;
  const idatChunks: Uint8Array[] = [];
  let idatLength = 0;
  while (offset + 12 <= bytes.length) {
    const length = readBigEndianUint32(bytes, offset);
    const typeOffset = offset + 4;
    const dataOffset = typeOffset + 4;
    const nextOffset = dataOffset + length + 4;
    if (nextOffset > bytes.length) {
      throw new Error('Orientation probe contains a truncated PNG chunk');
    }

    const type = String.fromCharCode(
      bytes[typeOffset],
      bytes[typeOffset + 1],
      bytes[typeOffset + 2],
      bytes[typeOffset + 3]
    );
    if (type === 'IHDR') {
      if (length !== 13 || pngWidth !== 0 || pngHeight !== 0) {
        throw new Error('Orientation probe contains an invalid PNG header');
      }
      pngWidth = readBigEndianUint32(bytes, dataOffset);
      pngHeight = readBigEndianUint32(bytes, dataOffset + 4);
      bitDepth = bytes[dataOffset + 8];
      colorType = bytes[dataOffset + 9];
      compressionMethod = bytes[dataOffset + 10];
      filterMethod = bytes[dataOffset + 11];
      interlaceMethod = bytes[dataOffset + 12];
    } else if (type === 'IDAT') {
      idatChunks.push(bytes.slice(dataOffset, dataOffset + length));
      idatLength += length;
    } else if (type === 'IEND') {
      break;
    }
    offset = nextOffset;
  }

  if (pngWidth === 0 || pngHeight === 0 || idatLength === 0) {
    throw new Error('Orientation probe PNG is missing raster data');
  }
  if (
    bitDepth !== 8 ||
    compressionMethod !== 0 ||
    filterMethod !== 0 ||
    interlaceMethod !== 0
  ) {
    throw new Error(
      `Unsupported PNG format: depth=${bitDepth}, compression=${compressionMethod}, ` +
        `filter=${filterMethod}, interlace=${interlaceMethod}`
    );
  }

  const channelCount = channelCountForPngColorType(colorType);
  const compressed = new Uint8Array(idatLength);
  let compressedOffset = 0;
  idatChunks.forEach((chunk) => {
    compressed.set(chunk, compressedOffset);
    compressedOffset += chunk.length;
  });
  const filtered = inflate(compressed);
  const rowLength = pngWidth * channelCount;
  const expectedLength = pngHeight * (rowLength + 1);
  if (filtered.length !== expectedLength) {
    throw new Error(
      `PNG scanline length ${filtered.length} does not match ${expectedLength}`
    );
  }

  const samples = new Uint8Array(pngHeight * rowLength);
  for (let row = 0; row < pngHeight; row += 1) {
    const filteredOffset = row * (rowLength + 1);
    const filterType = filtered[filteredOffset];
    if (filterType > 4) {
      throw new Error(`Unsupported PNG scanline filter ${filterType}`);
    }
    const rowOffset = row * rowLength;
    const previousRowOffset = rowOffset - rowLength;
    for (let column = 0; column < rowLength; column += 1) {
      const encoded = filtered[filteredOffset + column + 1];
      const left =
        column >= channelCount ? samples[rowOffset + column - channelCount] : 0;
      const up = row > 0 ? samples[previousRowOffset + column] : 0;
      const upperLeft =
        row > 0 && column >= channelCount
          ? samples[previousRowOffset + column - channelCount]
          : 0;
      let predictor = 0;
      switch (filterType) {
        case 1:
          predictor = left;
          break;
        case 2:
          predictor = up;
          break;
        case 3:
          predictor = Math.floor((left + up) / 2);
          break;
        case 4:
          predictor = paethPredictor(left, up, upperLeft);
          break;
      }
      samples[rowOffset + column] = (encoded + predictor) % 256;
    }
  }

  const rgba = new Uint8Array(pngWidth * pngHeight * 4);
  for (let pixel = 0; pixel < pngWidth * pngHeight; pixel += 1) {
    const sourceOffset = pixel * channelCount;
    const rgbaOffset = pixel * 4;
    if (colorType === 0) {
      const gray = samples[sourceOffset];
      rgba[rgbaOffset] = gray;
      rgba[rgbaOffset + 1] = gray;
      rgba[rgbaOffset + 2] = gray;
      rgba[rgbaOffset + 3] = 255;
    } else if (colorType === 2) {
      rgba[rgbaOffset] = samples[sourceOffset];
      rgba[rgbaOffset + 1] = samples[sourceOffset + 1];
      rgba[rgbaOffset + 2] = samples[sourceOffset + 2];
      rgba[rgbaOffset + 3] = 255;
    } else if (colorType === 4) {
      const gray = samples[sourceOffset];
      rgba[rgbaOffset] = gray;
      rgba[rgbaOffset + 1] = gray;
      rgba[rgbaOffset + 2] = gray;
      rgba[rgbaOffset + 3] = samples[sourceOffset + 1];
    } else {
      rgba.set(samples.subarray(sourceOffset, sourceOffset + 4), rgbaOffset);
    }
  }

  return { width: pngWidth, height: pngHeight, rgba };
}

function assertSamePngRaster(actualBase64: string, referenceBase64: string) {
  const actual = decodePngRgba(actualBase64);
  const reference = decodePngRgba(referenceBase64);
  if (actual.width !== reference.width || actual.height !== reference.height) {
    throw new Error(
      `Watermark raster size ${actual.width}x${actual.height} does not match ` +
        `the upright reference ${reference.width}x${reference.height}`
    );
  }
  if (
    actual.rgba.length !== reference.rgba.length ||
    actual.rgba.some((value, index) => value !== reference.rgba[index])
  ) {
    throw new Error('Watermark pixels do not match the upright reference');
  }
}

const normalizeOffset = (value: OffsetValue) => {
  if (typeof value === 'string' && value.trim() === '') {
    return 0;
  }
  return value;
};

const formatResultUri = (path: string, saveFormat: ImageFormat) => {
  if (saveFormat === ImageFormat.base64) {
    return path.startsWith('data:') ? path : `data:image/png;base64,${path}`;
  }

  return Platform.OS === 'android' ? `file:${path}` : path;
};

const getImageSize = (uri: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      uri,
      (imageWidth, imageHeight) =>
        resolve({ width: imageWidth, height: imageHeight }),
      (error) => reject(error)
    );
  });

function sourceFromBackgroundFormat(
  format: BackgroundFormat,
  assets: ImageMarkerLabAssets
) {
  switch (format) {
    case 'base64':
      return assets.base64Bg;
    case 'rotated image':
      return assets.orientationBg ?? assets.bg;
    case 'normal image':
    case 'picked image':
      return assets.bg;
  }
}

function useViewModel(props: ImageMarkerLabProps) {
  const { assets } = props;
  const [backgroundFormat, setBackgroundFormat] =
    useState<BackgroundFormat>('normal image');
  const [waterMarkType, setWaterMarkType] = useState<WatermarkType>('text');
  const [saveFormat, setSaveFormat] = useState<ImageFormat>(ImageFormat.png);
  const [image, setImage] = useState<unknown>(assets.bg);
  const [uri, setUri] = useState('');
  const [marker, setMarker] = useState<unknown>(assets.icon);
  const [text, setText] = useState('Anchor + offset');
  const [useTextShadow, setUseTextShadow] = useState(false);
  const [useTextBgStyle, setUseTextBgStyle] = useState(true);
  const [textBgStretch, setTextBgStretch] = useState<TextBackgroundType>(
    TextBackgroundType.none
  );
  const [position, setPosition] = useState<Position>(Position.topRight);
  const [X, setX] = useState<OffsetValue>(40);
  const [Y, setY] = useState<OffsetValue>(32);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [italic, setItalic] = useState(false);
  const [bold, setBold] = useState(true);
  const [strikeThrough, setStrikeThrough] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'right' | 'center'>(
    'center'
  );
  const [textRotate, setTextRotate] = useState(0);
  const [textOptionsVisible, setTextOptionsVisible] = useState(false);
  const [backgroundScale, setBackgroundScale] = useState(1);
  const [backgroundRotate, setBackgroundRotate] = useState(0);
  const [backgroundAlpha, setBackgroundAlpha] = useState(1);
  const [watermarkScale, setWatermarkScale] = useState(1);
  const [watermarkRotate, setWatermarkRotate] = useState(0);
  const [watermarkAlpha, setWatermarkAlpha] = useState(1);
  const [quality, setQuality] = useState(100);
  const [fileSize, setFileSize] = useState('0 B');
  const [fontSize, setFontSize] = useState(36);
  const [lastRun, setLastRun] = useState('Ready');
  const [resultContract, setResultContract] = useState('');

  useEffect(() => {
    if (backgroundFormat !== 'picked image') {
      setImage(sourceFromBackgroundFormat(backgroundFormat, assets));
    }
  }, [assets, backgroundFormat]);

  const config = useMemo<MarkerConfig>(
    () => ({
      image,
      marker,
      waterMarkType,
      text,
      fontName: exampleFontName,
      position,
      X,
      Y,
      saveFormat,
      useTextShadow,
      useTextBgStyle,
      textBgStretch,
      underline,
      italic,
      bold,
      strikeThrough,
      textAlign,
      textRotate,
      backgroundScale,
      backgroundRotate,
      backgroundAlpha,
      watermarkScale,
      watermarkRotate,
      watermarkAlpha,
      quality,
      fontSize,
    }),
    [
      image,
      marker,
      waterMarkType,
      text,
      position,
      X,
      Y,
      saveFormat,
      useTextShadow,
      useTextBgStyle,
      textBgStretch,
      underline,
      italic,
      bold,
      strikeThrough,
      textAlign,
      textRotate,
      backgroundScale,
      backgroundRotate,
      backgroundAlpha,
      watermarkScale,
      watermarkRotate,
      watermarkAlpha,
      quality,
      fontSize,
    ]
  );

  function applyConfig(next: Partial<MarkerConfig>) {
    if (next.image !== undefined) {
      setImage(next.image);
    }
    if (next.marker !== undefined) {
      setMarker(next.marker);
    }
    if (next.waterMarkType !== undefined) {
      setWaterMarkType(next.waterMarkType);
    }
    if (next.text !== undefined) {
      setText(next.text);
    }
    if (next.position !== undefined) {
      setPosition(next.position);
    }
    if (next.X !== undefined) {
      setX(next.X);
    }
    if (next.Y !== undefined) {
      setY(next.Y);
    }
    if (next.saveFormat !== undefined) {
      setSaveFormat(next.saveFormat);
    }
    if (next.useTextShadow !== undefined) {
      setUseTextShadow(next.useTextShadow);
    }
    if (next.useTextBgStyle !== undefined) {
      setUseTextBgStyle(next.useTextBgStyle);
    }
    if (next.textBgStretch !== undefined) {
      setTextBgStretch(next.textBgStretch);
    }
    if (next.underline !== undefined) {
      setUnderline(next.underline);
    }
    if (next.italic !== undefined) {
      setItalic(next.italic);
    }
    if (next.bold !== undefined) {
      setBold(next.bold);
    }
    if (next.strikeThrough !== undefined) {
      setStrikeThrough(next.strikeThrough);
    }
    if (next.textAlign !== undefined) {
      setTextAlign(next.textAlign);
    }
    if (next.textRotate !== undefined) {
      setTextRotate(next.textRotate);
    }
    if (next.backgroundScale !== undefined) {
      setBackgroundScale(next.backgroundScale);
    }
    if (next.backgroundRotate !== undefined) {
      setBackgroundRotate(next.backgroundRotate);
    }
    if (next.backgroundAlpha !== undefined) {
      setBackgroundAlpha(next.backgroundAlpha);
    }
    if (next.watermarkScale !== undefined) {
      setWatermarkScale(next.watermarkScale);
    }
    if (next.watermarkRotate !== undefined) {
      setWatermarkRotate(next.watermarkRotate);
    }
    if (next.watermarkAlpha !== undefined) {
      setWatermarkAlpha(next.watermarkAlpha);
    }
    if (next.quality !== undefined) {
      setQuality(next.quality);
    }
    if (next.fontSize !== undefined) {
      setFontSize(next.fontSize);
    }
  }

  async function updateFileSize(path: string, resultFormat: ImageFormat) {
    if (resultFormat === ImageFormat.base64) {
      setFileSize(filesize(path.length));
      return;
    }

    const size = await props.getFileSize(path);
    setFileSize(filesize(size));
  }

  async function runMark(
    mode: RunMode,
    overrides: Partial<MarkerConfig> = {},
    label = mode === 'anchorOffset' ? 'Anchor + offset' : 'Absolute X/Y'
  ) {
    const nextConfig = { ...config, ...overrides };
    applyConfig(overrides);
    setLastRun(label);
    setLoading(true);

    const positionOptions =
      mode === 'anchorOffset'
        ? {
            position: nextConfig.position,
            X: normalizeOffset(nextConfig.X),
            Y: normalizeOffset(nextConfig.Y),
          }
        : {
            X: normalizeOffset(nextConfig.X),
            Y: normalizeOffset(nextConfig.Y),
          };

    try {
      const backgroundImage = {
        src: nextConfig.image,
        scale: nextConfig.backgroundScale,
        alpha: nextConfig.backgroundAlpha,
        rotate: nextConfig.backgroundRotate,
      };
      const imageWatermark = {
        src: nextConfig.marker,
        scale: nextConfig.watermarkScale,
        alpha: nextConfig.watermarkAlpha,
        rotate: nextConfig.watermarkRotate,
        position: positionOptions,
      };
      const textWatermark = {
        text: nextConfig.text,
        position:
          nextConfig.waterMarkType === 'mixed' && mode === 'anchorOffset'
            ? {
                position: Position.bottomCenter,
                X: 0,
                Y: 28,
              }
            : positionOptions,
        style: {
          color: '#F8FAFC',
          fontName: nextConfig.fontName,
          fontSize: nextConfig.fontSize,
          underline: nextConfig.underline,
          bold: nextConfig.bold,
          italic: nextConfig.italic,
          strikeThrough: nextConfig.strikeThrough,
          textAlign: nextConfig.textAlign,
          rotate: nextConfig.textRotate,
          shadowStyle: nextConfig.useTextShadow
            ? {
                dx: 8,
                dy: 10,
                radius: 12,
                color: '#0F172A',
              }
            : null,
          textBackgroundStyle: nextConfig.useTextBgStyle
            ? {
                type: nextConfig.textBgStretch,
                paddingX: 12,
                paddingY: 8,
                color: '#1E293BCC',
                cornerRadius: {
                  topLeft: { x: 8, y: 8 },
                  topRight: { x: 8, y: 8 },
                  bottomLeft: { x: 8, y: 8 },
                  bottomRight: { x: 8, y: 8 },
                },
              }
            : null,
        },
      };
      let path: string;

      if (nextConfig.waterMarkType === 'image') {
        path = await Marker.markImage({
          backgroundImage,
          watermarkImages: [imageWatermark],
          quality: nextConfig.quality,
          saveFormat: nextConfig.saveFormat,
        });
      } else if (nextConfig.waterMarkType === 'mixed') {
        path = await Marker.mark({
          backgroundImage,
          watermarks: [
            {
              ...textWatermark,
              type: 'text',
            },
            {
              ...imageWatermark,
              type: 'image',
            },
          ],
          quality: nextConfig.quality,
          saveFormat: nextConfig.saveFormat,
        });
      } else {
        path = await Marker.markText({
          backgroundImage,
          watermarkTexts: [textWatermark],
          quality: nextConfig.quality,
          saveFormat: nextConfig.saveFormat,
        });
      }

      setUri(formatResultUri(path, nextConfig.saveFormat));
      setShow(true);
      await updateFileSize(path, nextConfig.saveFormat);
    } catch (error) {
      console.log('mark image error', error);
      Toast.show({
        type: 'error',
        text1: 'mark failed',
        text2: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function pickImage(type: 'image' | 'mark') {
    let selectedUri: string | null = null;
    try {
      selectedUri = await props.pickImage(type);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'image picker error',
        text2: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    if (!selectedUri) {
      return;
    }

    if (type === 'image') {
      setBackgroundFormat('picked image');
      setImage(selectedUri);
    } else {
      setMarker(selectedUri);
    }
  }

  function runTextOffsetFeature() {
    setBackgroundFormat('normal image');
    runMark(
      'anchorOffset',
      {
        image: assets.bg,
        marker: assets.icon,
        waterMarkType: 'text',
        text: 'Text offset',
        position: Position.topRight,
        X: 56,
        Y: 36,
        saveFormat: ImageFormat.png,
        useTextShadow: false,
        useTextBgStyle: true,
        textBgStretch: TextBackgroundType.none,
        bold: true,
        fontSize: 36,
        backgroundScale: 1,
        backgroundRotate: 0,
        backgroundAlpha: 1,
      },
      'Text anchor offset'
    );
  }

  function runImageOffsetFeature() {
    setBackgroundFormat('normal image');
    runMark(
      'anchorOffset',
      {
        image: assets.bg,
        marker: assets.icon1,
        waterMarkType: 'image',
        position: Position.bottomRight,
        X: 64,
        Y: 44,
        saveFormat: ImageFormat.png,
        watermarkScale: 0.7,
        watermarkRotate: 0,
        watermarkAlpha: 0.9,
        backgroundScale: 1,
        backgroundRotate: 0,
        backgroundAlpha: 1,
      },
      'Image anchor offset'
    );
  }

  async function runMixedWatermarkFeature() {
    setBackgroundFormat('normal image');
    applyConfig({
      image: assets.bg,
      marker: assets.icon,
      waterMarkType: 'mixed',
      text: 'Mixed watermark',
      saveFormat: ImageFormat.png,
      useTextShadow: true,
      useTextBgStyle: true,
      textBgStretch: TextBackgroundType.none,
      bold: true,
      fontSize: 34,
      watermarkScale: 0.58,
      watermarkRotate: 0,
      watermarkAlpha: 0.92,
      backgroundScale: 1,
      backgroundRotate: 0,
      backgroundAlpha: 1,
    });
    setLastRun('Mixed text + image');
    setLoading(true);

    try {
      const path = await Marker.mark({
        backgroundImage: {
          src: assets.bg,
          scale: 1,
        },
        watermarks: [
          {
            type: 'text',
            text: 'Mixed watermark',
            position: {
              position: Position.bottomCenter,
              X: 0,
              Y: 30,
            },
            style: {
              color: '#FFFFFF',
              fontName: exampleFontName,
              fontSize: 34,
              bold: true,
              shadowStyle: {
                dx: 8,
                dy: 10,
                radius: 12,
                color: '#0F172A',
              },
              textBackgroundStyle: {
                type: TextBackgroundType.none,
                paddingX: 14,
                paddingY: 9,
                color: '#1E293BCC',
                cornerRadius: {
                  all: { x: 10, y: 10 },
                },
              },
            },
          },
          {
            type: 'image',
            src: assets.icon,
            scale: 0.58,
            alpha: 0.92,
            position: {
              position: Position.topRight,
              X: 26,
              Y: 26,
            },
          },
        ],
        quality: 100,
        saveFormat: ImageFormat.png,
      });

      setUri(formatResultUri(path, ImageFormat.png));
      setShow(true);
      await updateFileSize(path, ImageFormat.png);
    } catch (error) {
      console.log('mixed watermark error', error);
      Toast.show({
        type: 'error',
        text1: 'mixed watermark failed',
        text2: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function runSharpScaledWatermarkFeature() {
    setBackgroundFormat('normal image');
    applyConfig({
      image: assets.bg,
      marker: sharpWatermarkDataUrl,
      waterMarkType: 'image',
      position: Position.center,
      X: 0,
      Y: 0,
      saveFormat: ImageFormat.png,
      watermarkScale: 2.4,
      watermarkRotate: 0,
      watermarkAlpha: 1,
      backgroundScale: 1,
      backgroundRotate: 0,
      backgroundAlpha: 1,
      quality: 100,
    });
    setLastRun('Sharp scaled watermark');
    setLoading(true);

    try {
      const path = await Marker.markImage({
        backgroundImage: {
          src: assets.bg,
          scale: 1,
        },
        watermarkImages: [
          {
            src: sharpWatermarkDataUrl,
            scale: 2.4,
            alpha: 1,
            position: {
              position: Position.center,
              X: 0,
              Y: 0,
            },
          },
        ],
        quality: 100,
        saveFormat: ImageFormat.png,
      });

      setUri(formatResultUri(path, ImageFormat.png));
      setShow(true);
      await updateFileSize(path, ImageFormat.png);
    } catch (error) {
      console.log('sharp scaled watermark error', error);
      Toast.show({
        type: 'error',
        text1: 'sharp watermark failed',
        text2: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function runRotationOutputPolicyFeature() {
    setBackgroundFormat('normal image');
    applyConfig({
      image: assets.bg,
      marker: paddedWatermarkDataUrl,
      waterMarkType: 'image',
      position: Position.center,
      X: 0,
      Y: 0,
      saveFormat: ImageFormat.jpg,
      watermarkScale: 1,
      watermarkRotate: 0,
      watermarkAlpha: 1,
      backgroundScale: 1,
      backgroundRotate: 30,
      backgroundAlpha: 1,
      quality: 100,
    });
    setLastRun('Rotation crop + JPG matte');
    setUri('');
    setShow(false);
    setFileSize('0 B');
    setResultContract('');
    setLoading(true);

    try {
      const outputOptions = {
        backgroundImage: {
          src: assets.bg,
          scale: 1,
          rotate: 30,
        },
        quality: 100,
        saveFormat: ImageFormat.jpg,
        rotationCanvasMode: RotationCanvasMode.crop,
      };
      const watermarkOptions = {
        src: paddedWatermarkDataUrl,
        scale: 1,
        position: {
          position: Position.center,
          X: 0,
          Y: 0,
          edgeInset: 0,
        },
      };
      const path = await Marker.markImage({
        ...outputOptions,
        watermarkImages: [
          { ...watermarkOptions, trimTransparentPadding: true },
        ],
        matteColor: '#F8FAFC',
      });

      let untrimmedProbePath = '';
      let darkMatteProbePath = '';
      try {
        untrimmedProbePath = await Marker.markImage({
          ...outputOptions,
          watermarkImages: [
            { ...watermarkOptions, trimTransparentPadding: false },
          ],
          matteColor: '#F8FAFC',
          filename: 'rotation-output-untrimmed-probe',
        });
        darkMatteProbePath = await Marker.markImage({
          ...outputOptions,
          watermarkImages: [
            { ...watermarkOptions, trimTransparentPadding: true },
          ],
          matteColor: '#000000',
          filename: 'rotation-output-dark-matte-probe',
        });

        const [outputBytes, untrimmedBytes, darkMatteBytes] = await Promise.all(
          [
            props.readFileBase64(path),
            props.readFileBase64(untrimmedProbePath),
            props.readFileBase64(darkMatteProbePath),
          ]
        );
        const normalizedOutputBytes = outputBytes.replace(/\s/g, '');
        if (!normalizedOutputBytes.startsWith('/9j/')) {
          throw new Error('Output bytes do not contain a JPEG signature');
        }
        if (normalizedOutputBytes === untrimmedBytes.replace(/\s/g, '')) {
          throw new Error(
            'Transparent-padding trim did not affect output pixels'
          );
        }
        if (normalizedOutputBytes === darkMatteBytes.replace(/\s/g, '')) {
          throw new Error('JPEG matte color did not affect output pixels');
        }
      } finally {
        await Promise.all(
          [untrimmedProbePath, darkMatteProbePath]
            .filter(Boolean)
            .map((probePath) =>
              props.removeFile(probePath).catch(() => undefined)
            )
        );
      }

      const outputUri = formatResultUri(path, ImageFormat.jpg);
      const source = Image.resolveAssetSource(assets.bg as ImageSourcePropType);
      const outputSize = await getImageSize(outputUri);
      if (!path.toLowerCase().endsWith('.jpg')) {
        throw new Error(`Expected a .jpg output path, received ${path}`);
      }
      if (
        Math.round(outputSize.width) !== Math.round(source.width) ||
        Math.round(outputSize.height) !== Math.round(source.height)
      ) {
        throw new Error(
          `Crop output ${outputSize.width}x${outputSize.height} did not preserve ` +
            `${source.width}x${source.height}`
        );
      }

      setUri(outputUri);
      setShow(true);
      setResultContract('rotation-output-validated');
      await updateFileSize(path, ImageFormat.jpg);
    } catch (error) {
      console.log('rotation output policy error', error);
      Toast.show({
        type: 'error',
        text1: 'rotation output policy failed',
        text2: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function runWatermarkOrientationFeature() {
    setBackgroundFormat('normal image');
    applyConfig({
      image: solidWatermarkBackgroundDataUrl,
      marker: asymmetricWatermarkDataUrl,
      waterMarkType: 'image',
      position: Position.topLeft,
      X: 0,
      Y: 0,
      saveFormat: ImageFormat.png,
      watermarkScale: 1,
      watermarkRotate: 0,
      watermarkAlpha: 1,
      backgroundScale: 1,
      backgroundRotate: 0,
      backgroundAlpha: 1,
      quality: 100,
    });
    setLastRun('Watermark orientation');
    setUri('');
    setShow(false);
    setFileSize('0 B');
    setResultContract('');
    setLoading(true);

    let referencePath = '';
    try {
      const watermarkOptions = {
        src: asymmetricWatermarkDataUrl,
        scale: 1,
        rotate: 0,
        position: {
          position: Position.topLeft,
          X: 0,
          Y: 0,
          edgeInset: 0,
        },
        trimTransparentPadding: false,
      };
      referencePath = await Marker.markImage({
        backgroundImage: {
          src: asymmetricWatermarkDataUrl,
          scale: 1,
        },
        watermarkImages: [{ ...watermarkOptions, alpha: 0 }],
        quality: 100,
        saveFormat: ImageFormat.png,
        filename: 'watermark-orientation-reference',
      });
      const path = await Marker.markImage({
        backgroundImage: {
          src: solidWatermarkBackgroundDataUrl,
          scale: 1,
        },
        watermarkImages: [{ ...watermarkOptions, alpha: 1 }],
        quality: 100,
        saveFormat: ImageFormat.png,
        filename: 'watermark-orientation-output',
      });

      const [outputBytes, referenceBytes] = await Promise.all([
        props.readFileBase64(path),
        props.readFileBase64(referencePath),
      ]);
      assertSamePngRaster(outputBytes, referenceBytes);

      const outputUri = formatResultUri(path, ImageFormat.png);
      const outputSize = await getImageSize(outputUri);
      if (outputSize.width !== 48 || outputSize.height !== 32) {
        throw new Error(
          'Expected a 48x32 orientation probe, received ' +
            `${outputSize.width}x${outputSize.height}`
        );
      }

      setUri(outputUri);
      setShow(true);
      setResultContract('watermark-orientation-validated');
      await updateFileSize(path, ImageFormat.png);
    } catch (error) {
      console.log('watermark orientation error', error);
      Toast.show({
        type: 'error',
        text1: 'watermark orientation failed',
        text2: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (referencePath) {
        await props.removeFile(referencePath).catch(() => undefined);
      }
      setLoading(false);
    }
  }

  function runExtraFeature() {
    const isOrientation = props.featureVariant === 'orientation';

    setBackgroundFormat(isOrientation ? 'rotated image' : 'base64');
    runMark(
      'anchorOffset',
      {
        image: isOrientation
          ? assets.orientationBg ?? assets.bg
          : assets.base64Bg,
        marker: assets.icon,
        waterMarkType: 'text',
        text: isOrientation ? 'Orientation check' : 'Base64 background',
        position: Position.bottomCenter,
        X: 0,
        Y: 32,
        saveFormat: ImageFormat.jpg,
        useTextShadow: true,
        useTextBgStyle: true,
        textBgStretch: TextBackgroundType.none,
        bold: true,
        fontSize: 32,
        backgroundScale: 1,
        backgroundRotate: 0,
        backgroundAlpha: 1,
      },
      isOrientation ? 'Orientation normalization' : 'Base64 background'
    );
  }

  async function runPositionPresetSamples() {
    const nextConfig = config;
    setLastRun('Position preset samples');
    setLoading(true);

    try {
      const path =
        nextConfig.waterMarkType === 'image'
          ? await Marker.markImage({
              backgroundImage: {
                src: nextConfig.image,
                scale: nextConfig.backgroundScale,
                alpha: nextConfig.backgroundAlpha,
                rotate: nextConfig.backgroundRotate,
              },
              watermarkImage: {
                src: nextConfig.marker,
                scale: nextConfig.watermarkScale,
                alpha: nextConfig.watermarkAlpha,
                rotate: nextConfig.watermarkRotate,
              },
              watermarkPositions: {
                position: nextConfig.position,
              },
              quality: nextConfig.quality,
              saveFormat: nextConfig.saveFormat,
              watermarkImages: [
                {
                  src: assets.icon1,
                  scale: nextConfig.watermarkScale,
                  alpha: nextConfig.watermarkAlpha,
                  rotate: nextConfig.watermarkRotate,
                  position: {
                    position: Position.topLeft,
                  },
                },
                {
                  src: nextConfig.marker,
                  scale: nextConfig.watermarkScale,
                  alpha: nextConfig.watermarkAlpha,
                  rotate: nextConfig.watermarkRotate,
                  position: {
                    position: Position.topRight,
                  },
                },
              ],
            })
          : await Marker.markText({
              backgroundImage: {
                src: nextConfig.image,
                scale: nextConfig.backgroundScale,
                alpha: nextConfig.backgroundAlpha,
                rotate: nextConfig.backgroundRotate,
              },
              watermarkTexts: [
                {
                  text: nextConfig.text,
                  position: {
                    position: nextConfig.position,
                  },
                  style: {
                    color: '#FF0000AA',
                    fontName: 'MaShanZheng-Regular',
                    fontSize: nextConfig.fontSize,
                    underline: nextConfig.underline,
                    bold: nextConfig.bold,
                    italic: nextConfig.italic,
                    strikeThrough: nextConfig.strikeThrough,
                    textAlign: nextConfig.textAlign,
                    rotate: nextConfig.textRotate,
                    shadowStyle: nextConfig.useTextShadow
                      ? {
                          dx: 10.5,
                          dy: 20.8,
                          radius: 20.9,
                          color: '#0000FF',
                        }
                      : null,
                    textBackgroundStyle: nextConfig.useTextBgStyle
                      ? {
                          type: nextConfig.textBgStretch,
                          paddingBottom: '15%',
                          paddingRight: '10%',
                          paddingTop: '15%',
                          paddingLeft: '100',
                          color: '#0f0A',
                        }
                      : null,
                  },
                },
                {
                  text: 'text marker normal',
                  position: {
                    position: Position.center,
                  },
                  style: {
                    color: '#FF00AA9F',
                    fontName: 'RubikBurned-Regular',
                    fontSize: nextConfig.fontSize,
                    underline: nextConfig.underline,
                    bold: nextConfig.bold,
                    italic: nextConfig.italic,
                    strikeThrough: nextConfig.strikeThrough,
                    textAlign: nextConfig.textAlign,
                    rotate: nextConfig.textRotate,
                    shadowStyle: nextConfig.useTextShadow
                      ? {
                          dx: 10.5,
                          dy: 20.8,
                          radius: 20.9,
                          color: '#00EEFF',
                        }
                      : null,
                    textBackgroundStyle: nextConfig.useTextBgStyle
                      ? {
                          type: nextConfig.textBgStretch,
                          padding: '10%',
                          color: '#0fA',
                          cornerRadius: {
                            topLeft: {
                              x: '20%',
                              y: '50%',
                            },
                            topRight: {
                              x: '20%',
                              y: '50%',
                            },
                          },
                        }
                      : null,
                  },
                },
              ],
              quality: nextConfig.quality,
              saveFormat: nextConfig.saveFormat,
            });

      setUri(formatResultUri(path, nextConfig.saveFormat));
      setShow(true);
      await updateFileSize(path, nextConfig.saveFormat);
    } catch (error) {
      console.log('position preset samples error', error);
      Toast.show({
        type: 'error',
        text1: 'position presets failed',
        text2: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function runAbsoluteCoordinateSamples() {
    const nextConfig = config;
    setLastRun('Absolute coordinate samples');
    setLoading(true);

    try {
      const path =
        nextConfig.waterMarkType === 'image'
          ? await Marker.markImage({
              backgroundImage: {
                src: nextConfig.image,
                scale: nextConfig.backgroundScale,
                rotate: nextConfig.backgroundRotate,
                alpha: nextConfig.backgroundAlpha,
              },
              watermarkImages: [
                {
                  src: nextConfig.marker,
                  scale: nextConfig.watermarkScale,
                  alpha: nextConfig.watermarkAlpha,
                  rotate: nextConfig.watermarkRotate,
                  position: {
                    X: normalizeOffset(nextConfig.X),
                    Y: normalizeOffset(nextConfig.Y),
                  },
                },
                {
                  src: assets.icon1,
                  scale: nextConfig.watermarkScale,
                  alpha: nextConfig.watermarkAlpha,
                  rotate: nextConfig.watermarkRotate,
                  position: { X: 200, Y: 100 },
                },
              ],
              quality: nextConfig.quality,
              saveFormat: nextConfig.saveFormat,
            })
          : await Marker.markText({
              backgroundImage: {
                src: nextConfig.image,
                scale: nextConfig.backgroundScale,
                alpha: nextConfig.backgroundAlpha,
                rotate: nextConfig.backgroundRotate,
              },
              watermarkTexts: [
                {
                  text: nextConfig.text,
                  position: {
                    X: normalizeOffset(nextConfig.X),
                    Y: normalizeOffset(nextConfig.Y),
                  },
                  style: {
                    underline: nextConfig.underline,
                    strikeThrough: nextConfig.strikeThrough,
                    color: '#FF0',
                    fontName: 'NotoSansSC-Regular',
                    fontSize: nextConfig.fontSize,
                    bold: nextConfig.bold,
                    italic: nextConfig.italic,
                    textAlign: nextConfig.textAlign,
                    rotate: nextConfig.textRotate,
                    shadowStyle: nextConfig.useTextShadow
                      ? {
                          dx: 10.5,
                          dy: 20.8,
                          radius: 20.9,
                          color: '#0000FF',
                        }
                      : null,
                    textBackgroundStyle: nextConfig.useTextBgStyle
                      ? {
                          type: nextConfig.textBgStretch,
                          paddingX: 10,
                          paddingY: 10,
                          color: '#00B96B',
                        }
                      : null,
                  },
                },
                {
                  text: nextConfig.text,
                  position: {
                    X: 500,
                    Y: 600,
                  },
                  style: {
                    underline: true,
                    strikeThrough: true,
                    bold: true,
                    italic: true,
                    color: '#FF0',
                    fontSize: nextConfig.fontSize,
                    textAlign: nextConfig.textAlign,
                    rotate: nextConfig.textRotate,
                    shadowStyle: nextConfig.useTextShadow
                      ? {
                          dx: 10.5,
                          dy: 20.8,
                          radius: 20.9,
                          color: '#0000FF',
                        }
                      : null,
                    textBackgroundStyle: nextConfig.useTextBgStyle
                      ? {
                          type: nextConfig.textBgStretch,
                          padding: '10%',
                          color: '#0f09',
                        }
                      : null,
                  },
                },
              ],
              quality: nextConfig.quality,
              saveFormat: nextConfig.saveFormat,
            });

      setUri(formatResultUri(path, nextConfig.saveFormat));
      setShow(true);
      await updateFileSize(path, nextConfig.saveFormat);
    } catch (error) {
      console.log('absolute coordinate samples error', error);
      Toast.show({
        type: 'error',
        text1: 'absolute coordinates failed',
        text2: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return {
    state: {
      image,
      uri,
      loading,
      show,
      backgroundFormat,
      saveFormat,
      useTextShadow,
      useTextBgStyle,
      textBgStretch,
      waterMarkType,
      text,
      position,
      underline,
      strikeThrough,
      bold,
      italic,
      X,
      Y,
      backgroundScale,
      backgroundAlpha,
      backgroundRotate,
      watermarkScale,
      watermarkAlpha,
      watermarkRotate,
      textOptionsVisible,
      textAlign,
      textRotate,
      quality,
      fileSize,
      fontSize,
      lastRun,
      resultContract,
    },
    actions: {
      setBackgroundFormat,
      setWaterMarkType,
      setSaveFormat,
      setUseTextShadow,
      setUseTextBgStyle,
      setTextBgStretch,
      setText,
      setPosition,
      setItalic,
      setBold,
      setStrikeThrough,
      setUnderline,
      setX,
      setY,
      setBackgroundAlpha,
      setBackgroundScale,
      setBackgroundRotate,
      setWatermarkAlpha,
      setWatermarkRotate,
      setWatermarkScale,
      setTextOptionsVisible,
      setTextAlign,
      setTextRotate,
      setQuality,
      setFontSize,
      pickImage,
      runMark,
      runTextOffsetFeature,
      runImageOffsetFeature,
      runMixedWatermarkFeature,
      runSharpScaledWatermarkFeature,
      runRotationOutputPolicyFeature,
      runWatermarkOrientationFeature,
      runExtraFeature,
      runPositionPresetSamples,
      runAbsoluteCoordinateSamples,
      clearResult: () => {
        setUri('');
        setShow(false);
        setFileSize('0 B');
        setLastRun('Ready');
        setResultContract('');
      },
    },
  };
}

function TabPage(props: {
  show: boolean;
  uri: string;
  fileSize: string;
  resultContract?: string;
  onClear: () => void;
  compactPreview?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <ArchitecturePanel />
      <PreviewPanel
        compact={props.compactPreview}
        show={props.show}
        uri={props.uri}
        fileSize={props.fileSize}
        onClear={props.onClear}
      />
      {props.resultContract ? (
        <Text
          accessibilityLabel={props.resultContract}
          testID={props.resultContract}
        >
          {props.resultContract}
        </Text>
      ) : null}
      {props.children}
    </>
  );
}

function ImageMarkerLab(props: ImageMarkerLabProps) {
  const { state, actions } = useViewModel(props);
  const [activeTab, setActiveTab] = useState<AppTab>('tests');
  const extraFeature =
    props.featureVariant === 'orientation'
      ? {
          badge: 'EXIF',
          title: 'Orientation normalization',
          meta: 'rotated source image',
          testID: 'feature-orientation-normalization',
        }
      : {
          badge: 'Base64',
          title: 'Base64 background',
          meta: 'asset source',
          testID: 'feature-base64-background',
        };

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.content,
          activeTab === 'tests' ? s.contentWithoutBottomBar : null,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <Text style={s.eyebrow}>react-native-image-marker</Text>
          <View style={s.headerTitleRow}>
            <Text style={s.title}>Image Marker Lab</Text>
            <View style={s.statusPill}>
              <Text style={s.statusText} numberOfLines={1}>
                {state.lastRun}
              </Text>
            </View>
          </View>
          <TabBar value={activeTab} onChange={setActiveTab} />
        </View>

        {activeTab === 'tests' ? (
          <TabPage
            show={state.show}
            uri={state.uri}
            fileSize={state.fileSize}
            resultContract={state.resultContract}
            onClear={actions.clearResult}
          >
            <Section title="Feature checks">
              <View style={s.featureList}>
                <FeatureCard
                  badge="Text"
                  title="Anchored text offset"
                  meta="topRight + X/Y"
                  tone="blue"
                  testID="feature-text-anchor-offset"
                  onPress={actions.runTextOffsetFeature}
                />
                <FeatureCard
                  badge="Image"
                  title="Anchored image offset"
                  meta="bottomRight + X/Y"
                  tone="green"
                  testID="feature-image-anchor-offset"
                  onPress={actions.runImageOffsetFeature}
                />
                <FeatureCard
                  badge="Mixed"
                  title="Text + image watermark"
                  meta="single API call"
                  tone="blue"
                  testID="feature-mixed-watermark"
                  onPress={actions.runMixedWatermarkFeature}
                />
                <FeatureCard
                  badge="Sharp"
                  title="Sharp scaled watermark"
                  meta="hard-edge PNG scale"
                  tone="green"
                  testID="feature-sharp-scaled-watermark"
                  onPress={actions.runSharpScaledWatermarkFeature}
                />
                <FeatureCard
                  badge="Rotate"
                  title="Rotation output policy"
                  meta="crop + JPG matte + trim"
                  tone="orange"
                  testID="feature-rotation-output-policy"
                  onPress={actions.runRotationOutputPolicyFeature}
                />
                <FeatureCard
                  badge="Pixels"
                  title="Watermark orientation"
                  meta="asymmetric pixel probe"
                  tone="green"
                  testID="feature-watermark-orientation"
                  onPress={actions.runWatermarkOrientationFeature}
                />
                <FeatureCard
                  badge={extraFeature.badge}
                  title={extraFeature.title}
                  meta={extraFeature.meta}
                  tone="orange"
                  testID={extraFeature.testID}
                  onPress={actions.runExtraFeature}
                />
              </View>
            </Section>

            <Section title="API mode checks">
              <View style={s.controlPanel}>
                <View style={s.runRow}>
                  <AppButton
                    wide
                    label="Position presets"
                    testID="api-position-preset-samples"
                    onPress={actions.runPositionPresetSamples}
                  />
                  <AppButton
                    wide
                    label="Absolute coords"
                    tone="neutral"
                    testID="api-absolute-coordinate-samples"
                    onPress={actions.runAbsoluteCoordinateSamples}
                  />
                </View>
              </View>
            </Section>
          </TabPage>
        ) : null}

        {activeTab === 'compose' ? (
          <TabPage
            compactPreview
            show={state.show}
            uri={state.uri}
            fileSize={state.fileSize}
            resultContract={state.resultContract}
            onClear={actions.clearResult}
          >
            <Section title="Watermark">
              <View style={s.controlPanel}>
                <View style={s.controlRow}>
                  <Text style={s.controlLabel}>Type</Text>
                  <ChipGroup
                    options={watermarkTypes}
                    value={state.waterMarkType}
                    onChange={actions.setWaterMarkType}
                  />
                </View>

                {state.waterMarkType !== 'image' ? (
                  <View style={s.textEditor}>
                    <TextInput
                      placeholder="Text watermark"
                      style={s.textArea}
                      onChangeText={actions.setText}
                      value={state.text}
                      multiline
                    />
                    <View style={s.inlineActions}>
                      <NumericField
                        label="Font"
                        value={state.fontSize}
                        min={1}
                        width={84}
                        onChange={actions.setFontSize}
                      />
                      <AppButton
                        compact
                        label="Text options"
                        tone="neutral"
                        onPress={() => actions.setTextOptionsVisible(true)}
                      />
                    </View>
                  </View>
                ) : null}

                {state.waterMarkType !== 'text' ? (
                  <View style={s.fieldGrid}>
                    <NumericField
                      label="WM scale"
                      value={state.watermarkScale}
                      min={0}
                      width={98}
                      onChange={actions.setWatermarkScale}
                    />
                    <NumericField
                      label="WM alpha"
                      value={state.watermarkAlpha}
                      min={0}
                      max={1}
                      width={98}
                      onChange={actions.setWatermarkAlpha}
                    />
                    <NumericField
                      label="WM rotate"
                      value={state.watermarkRotate}
                      min={-360}
                      max={360}
                      width={98}
                      onChange={actions.setWatermarkRotate}
                    />
                  </View>
                ) : null}
              </View>
            </Section>

            <Section title="Placement">
              <View style={s.controlPanel}>
                <View style={s.controlRow}>
                  <Text style={s.controlLabel}>Anchor</Text>
                  <ChipGroup
                    options={positions}
                    value={state.position}
                    onChange={actions.setPosition}
                  />
                </View>
                <View style={s.fieldGrid}>
                  <Field
                    label="X"
                    value={state.X}
                    width={98}
                    onChange={actions.setX}
                  />
                  <Field
                    label="Y"
                    value={state.Y}
                    width={98}
                    onChange={actions.setY}
                  />
                </View>
              </View>
            </Section>
          </TabPage>
        ) : null}

        {activeTab === 'advanced' ? (
          <TabPage
            compactPreview
            show={state.show}
            uri={state.uri}
            fileSize={state.fileSize}
            resultContract={state.resultContract}
            onClear={actions.clearResult}
          >
            <Section title="Input source">
              <View style={s.controlPanel}>
                <View style={s.controlRow}>
                  <Text style={s.controlLabel}>Background</Text>
                  <ChipGroup
                    options={props.backgroundFormats}
                    value={
                      state.backgroundFormat === 'picked image'
                        ? 'normal image'
                        : state.backgroundFormat
                    }
                    onChange={actions.setBackgroundFormat}
                  />
                </View>
                <View style={s.inlineActions}>
                  <AppButton
                    compact
                    tone="neutral"
                    label={
                      state.backgroundFormat === 'picked image'
                        ? 'Picked background'
                        : 'Pick background'
                    }
                    onPress={() => {
                      actions.pickImage('image');
                    }}
                  />
                  <AppButton
                    compact
                    tone="neutral"
                    label="Pick watermark"
                    onPress={() => {
                      actions.pickImage('mark');
                    }}
                  />
                </View>
              </View>
            </Section>

            <Section title="Background transform">
              <View style={s.controlPanel}>
                <View style={s.fieldGridFlush}>
                  <NumericField
                    label="BG scale"
                    value={state.backgroundScale}
                    min={0}
                    width={98}
                    onChange={actions.setBackgroundScale}
                  />
                  <NumericField
                    label="BG alpha"
                    value={state.backgroundAlpha}
                    min={0}
                    max={1}
                    width={98}
                    onChange={actions.setBackgroundAlpha}
                  />
                  <NumericField
                    label="BG rotate"
                    value={state.backgroundRotate}
                    min={-360}
                    max={360}
                    width={98}
                    onChange={actions.setBackgroundRotate}
                  />
                </View>
              </View>
            </Section>

            <Section title="Output">
              <View style={s.controlPanel}>
                <View style={s.outputFormatWide}>
                  <Text style={s.fieldLabel}>Format</Text>
                  <ChipGroup
                    options={saveFormats}
                    value={state.saveFormat}
                    onChange={actions.setSaveFormat}
                  />
                </View>
                <View style={s.fieldGrid}>
                  <NumericField
                    label="Quality"
                    value={state.quality}
                    min={0}
                    max={100}
                    width={98}
                    onChange={actions.setQuality}
                  />
                </View>
              </View>
            </Section>
          </TabPage>
        ) : null}
      </ScrollView>

      {activeTab !== 'tests' ? (
        <View style={s.bottomBar}>
          <AppButton
            wide
            compact
            label="Anchor + offset"
            onPress={() => {
              actions.runMark('anchorOffset');
            }}
          />
          <AppButton
            wide
            compact
            label="Absolute X/Y"
            tone="neutral"
            onPress={() => {
              actions.runMark('absoluteXY');
            }}
          />
        </View>
      ) : null}

      <Modal
        animationType="fade"
        transparent
        visible={state.textOptionsVisible}
        statusBarTranslucent
      >
        <View style={s.modalContainer}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Text options</Text>
              <AppButton
                compact
                label="Done"
                onPress={() => actions.setTextOptionsVisible(false)}
              />
            </View>
            <ToggleRow
              label="Shadow"
              value={state.useTextShadow}
              onValueChange={actions.setUseTextShadow}
            />
            <ToggleRow
              label="Background"
              value={state.useTextBgStyle}
              onValueChange={actions.setUseTextBgStyle}
            />
            {state.useTextBgStyle ? (
              <View style={s.modalBlock}>
                <Text style={s.modalLabel}>Background stretch</Text>
                <ChipGroup
                  options={textBgStretchOptions}
                  value={state.textBgStretch}
                  labelFor={(value) =>
                    value === TextBackgroundType.none ? 'fit' : value
                  }
                  onChange={actions.setTextBgStretch}
                />
              </View>
            ) : null}
            <View style={s.modalBlock}>
              <Text style={s.modalLabel}>Text align</Text>
              <ChipGroup
                options={textAlignOptions}
                value={state.textAlign}
                onChange={actions.setTextAlign}
              />
            </View>
            <View style={s.toggleGrid}>
              <ToggleRow
                label="Underline"
                value={state.underline}
                onValueChange={actions.setUnderline}
              />
              <ToggleRow
                label="Italic"
                value={state.italic}
                onValueChange={actions.setItalic}
              />
              <ToggleRow
                label="Bold"
                value={state.bold}
                onValueChange={actions.setBold}
              />
              <ToggleRow
                label="Strike"
                value={state.strikeThrough}
                onValueChange={actions.setStrikeThrough}
              />
            </View>
            <NumericField
              label="Rotate"
              value={state.textRotate}
              min={-360}
              max={360}
              width={112}
              onChange={actions.setTextRotate}
            />
          </View>
        </View>
      </Modal>

      {state.loading && (
        <View style={s.loading}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={s.loadingText}>Running marker...</Text>
        </View>
      )}
      <Toast />
    </SafeAreaView>
  );
}

export default ImageMarkerLab;

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F1F5F7',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 12,
    paddingBottom: 104,
  },
  contentWithoutBottomBar: {
    paddingBottom: 32,
  },
  header: {
    marginBottom: 10,
    paddingTop: 4,
  },
  headerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  eyebrow: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#0F172A',
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0,
  },
  statusPill: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 10,
    maxWidth: width * 0.45,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusText: {
    color: '#075985',
    fontSize: 12,
    fontWeight: '700',
  },
  featureList: {
    marginBottom: -8,
  },
  controlPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE5EA',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  controlRow: {
    marginBottom: 10,
  },
  controlLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  inlineActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 4,
  },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 8,
  },
  fieldGridFlush: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: -4,
  },
  fieldLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  textEditor: {
    marginTop: 2,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 7,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 15,
    minHeight: 76,
    paddingHorizontal: 10,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  outputFormatWide: {
    margin: 4,
  },
  runRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 8,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#DCE5EA',
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingBottom: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  modalContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    maxWidth: 520,
    padding: 16,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  modalBlock: {
    marginTop: 12,
  },
  modalLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  toggleGrid: {
    marginTop: 12,
  },
  loading: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
  },
});
