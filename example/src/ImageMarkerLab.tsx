import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Marker, {
  ImageFormat,
  Position,
  TextBackgroundType,
} from 'react-native-image-marker';
import Toast from 'react-native-toast-message';
import { filesize } from 'filesize';

const { width } = Dimensions.get('window');

export type PickImageTarget = 'image' | 'mark';

type BackgroundFormat =
  | 'normal image'
  | 'base64'
  | 'rotated image'
  | 'picked image';
type WatermarkType = 'text' | 'image';
type RunMode = 'anchorOffset' | 'absoluteXY';
type OffsetValue = number | string;
type AppTab = 'tests' | 'compose' | 'advanced';
type FeatureVariant = 'orientation' | 'base64';
type ArchitectureRuntime = {
  hasTurboModuleProxy: boolean;
  hasFabricUIManager: boolean;
  isBridgeless: boolean;
  modeLabel: string;
  isNewArchitecture: boolean;
};

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

const watermarkTypes: WatermarkType[] = ['text', 'image'];
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
const appTabs: Array<{ label: string; value: AppTab }> = [
  { label: 'Tests', value: 'tests' },
  { label: 'Compose', value: 'compose' },
  { label: 'Advanced', value: 'advanced' },
];

const exampleFontName = 'MaShanZheng-Regular';

function getArchitectureRuntime(): ArchitectureRuntime {
  const runtime = globalThis as typeof globalThis & {
    __turboModuleProxy?: unknown;
    nativeFabricUIManager?: unknown;
    RN$Bridgeless?: unknown;
  };
  const hasTurboModuleProxy = typeof runtime.__turboModuleProxy === 'function';
  const hasFabricUIManager = runtime.nativeFabricUIManager != null;
  const isBridgeless = runtime.RN$Bridgeless === true;
  const isNewArchitecture = hasTurboModuleProxy && hasFabricUIManager;

  return {
    hasTurboModuleProxy,
    hasFabricUIManager,
    isBridgeless,
    isNewArchitecture,
    modeLabel: isNewArchitecture ? 'New architecture' : 'Legacy bridge',
  };
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

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{props.title}</Text>
      {props.children}
    </View>
  );
}

function AppButton(props: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'neutral' | 'danger';
  compact?: boolean;
  wide?: boolean;
  testID?: string;
}) {
  const tone = props.tone ?? 'primary';

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      accessibilityLabel={props.label}
      accessibilityRole="button"
      onPress={props.onPress}
      testID={props.testID}
      style={[
        s.button,
        props.compact ? s.buttonCompact : null,
        props.wide ? s.buttonWide : null,
        tone === 'neutral' ? s.buttonNeutral : null,
        tone === 'danger' ? s.buttonDanger : null,
      ]}
    >
      <Text
        style={[s.buttonText, tone === 'neutral' ? s.buttonTextDark : null]}
      >
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

function Chip<T extends string>(props: {
  label: string;
  value: T;
  selected: boolean;
  onPress: (value: T) => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      accessibilityLabel={props.label}
      onPress={() => props.onPress(props.value)}
      style={[s.chip, props.selected ? s.chipSelected : null]}
    >
      <Text style={[s.chipText, props.selected ? s.chipTextSelected : null]}>
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

function ChipGroup<T extends string>(props: {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  labelFor?: (value: T) => string;
}) {
  return (
    <View style={s.chipGroup}>
      {props.options.map((option) => (
        <Chip
          key={option}
          label={props.labelFor ? props.labelFor(option) : option}
          value={option}
          selected={option === props.value}
          onPress={props.onChange}
        />
      ))}
    </View>
  );
}

function Field(props: {
  label: string;
  value: OffsetValue;
  onChange: (value: string) => void;
  width?: number;
}) {
  return (
    <View style={[s.field, props.width ? { width: props.width } : null]}>
      <Text style={s.fieldLabel}>{props.label}</Text>
      <TextInput
        keyboardType="default"
        onChangeText={props.onChange}
        selectTextOnFocus
        style={s.input}
        value={String(props.value)}
      />
    </View>
  );
}

function NumericField(props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  width?: number;
}) {
  return (
    <Field
      label={props.label}
      value={props.value}
      width={props.width}
      onChange={(text) => {
        const value = Number(text);
        if (!Number.isFinite(value)) {
          return;
        }
        if (props.min != null && value < props.min) {
          Toast.show({
            type: 'error',
            text1: `${props.label} range error`,
            text2: `${props.label} must be greater than or equal to ${props.min}`,
          });
          return;
        }
        if (props.max != null && value > props.max) {
          Toast.show({
            type: 'error',
            text1: `${props.label} range error`,
            text2: `${props.label} must be less than or equal to ${props.max}`,
          });
          return;
        }
        props.onChange(value);
      }}
    />
  );
}

function ToggleRow(props: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{props.label}</Text>
      <Switch value={props.value} onValueChange={props.onValueChange} />
    </View>
  );
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
                  position: positionOptions,
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
                  position: positionOptions,
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
                },
              ],
              quality: nextConfig.quality,
              saveFormat: nextConfig.saveFormat,
            });

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
      runExtraFeature,
      runPositionPresetSamples,
      runAbsoluteCoordinateSamples,
      clearResult: () => {
        setUri('');
        setShow(false);
        setFileSize('0 B');
        setLastRun('Ready');
      },
    },
  };
}

function FeatureCard(props: {
  badge: string;
  title: string;
  meta: string;
  tone: 'blue' | 'green' | 'orange';
  onPress: () => void;
  testID: string;
}) {
  const toneStyle = {
    blue: {
      badge: s.featureBadge_blue,
      card: s.featureCard_blue,
    },
    green: {
      badge: s.featureBadge_green,
      card: s.featureCard_green,
    },
    orange: {
      badge: s.featureBadge_orange,
      card: s.featureCard_orange,
    },
  }[props.tone];

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      accessibilityLabel={props.title}
      accessibilityRole="button"
      onPress={props.onPress}
      style={[s.featureCard, toneStyle.card]}
      testID={props.testID}
    >
      <Text numberOfLines={1} style={[s.featureBadge, toneStyle.badge]}>
        {props.badge}
      </Text>
      <View style={s.featureCopy}>
        <Text numberOfLines={1} style={s.featureTitle}>
          {props.title}
        </Text>
        <Text numberOfLines={1} style={s.featureMeta}>
          {props.meta}
        </Text>
      </View>
      <View style={s.featureRunPill}>
        <Text style={s.featureRunText}>Run</Text>
      </View>
    </TouchableOpacity>
  );
}

function TabBar(props: { value: AppTab; onChange: (value: AppTab) => void }) {
  return (
    <View style={s.tabs}>
      {appTabs.map((tab) => {
        const selected = tab.value === props.value;

        return (
          <TouchableOpacity
            activeOpacity={0.78}
            accessibilityLabel={tab.label}
            accessibilityRole="button"
            key={tab.value}
            onPress={() => props.onChange(tab.value)}
            style={[s.tab, selected ? s.tabSelected : null]}
          >
            <Text style={[s.tabText, selected ? s.tabTextSelected : null]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ArchitectureSignal(props: { label: string; active: boolean }) {
  return (
    <View
      accessibilityLabel={`${props.label} ${props.active ? 'on' : 'off'}`}
      style={s.archSignal}
    >
      <View
        style={[
          s.archSignalDot,
          props.active ? s.archSignalDotOn : s.archSignalDotOff,
        ]}
      />
      <Text style={s.archSignalLabel}>{props.label}</Text>
      <Text
        style={[
          s.archSignalValue,
          props.active ? s.archSignalValueOn : s.archSignalValueOff,
        ]}
      >
        {props.active ? 'on' : 'off'}
      </Text>
    </View>
  );
}

function ArchitecturePanel() {
  const runtime = useMemo(getArchitectureRuntime, []);

  return (
    <View
      accessibilityLabel={`runtime architecture ${runtime.modeLabel}`}
      accessible
      style={s.archPanel}
      testID="runtime-architecture-status"
    >
      <View style={s.archHeader}>
        <View>
          <Text style={s.archEyebrow}>Runtime</Text>
          <Text style={s.archTitle}>Architecture status</Text>
        </View>
        <View
          style={[
            s.archModePill,
            runtime.isNewArchitecture
              ? s.archModePillNew
              : s.archModePillLegacy,
          ]}
        >
          <Text
            style={[
              s.archModeText,
              runtime.isNewArchitecture
                ? s.archModeTextNew
                : s.archModeTextLegacy,
            ]}
            numberOfLines={1}
          >
            {runtime.modeLabel}
          </Text>
        </View>
      </View>
      <View style={s.archSignals}>
        <ArchitectureSignal
          label="TurboModule"
          active={runtime.hasTurboModuleProxy}
        />
        <ArchitectureSignal
          label="Fabric renderer"
          active={runtime.hasFabricUIManager}
        />
        <ArchitectureSignal label="Bridgeless" active={runtime.isBridgeless} />
      </View>
    </View>
  );
}

function TabPage(props: {
  show: boolean;
  uri: string;
  fileSize: string;
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
      {props.children}
    </>
  );
}

function PreviewPanel(props: {
  show: boolean;
  uri: string;
  fileSize: string;
  onClear: () => void;
  compact?: boolean;
}) {
  return (
    <View style={s.previewPanel}>
      <View style={s.previewHeader}>
        <View>
          <Text style={s.previewTitle}>Result preview</Text>
          <Text style={s.previewSubtle}>Size {props.fileSize}</Text>
        </View>
        <View style={s.previewActions}>
          <AppButton
            compact
            label="Clear"
            tone="neutral"
            onPress={props.onClear}
          />
        </View>
      </View>
      <View
        accessibilityLabel={
          props.show ? 'result-preview-ready' : 'result-preview-empty'
        }
        accessible
        style={[s.previewFrame, props.compact ? s.previewFrameCompact : null]}
        testID={props.show ? 'result-preview-ready' : 'result-preview-empty'}
      >
        {props.show ? (
          <Image
            accessible
            accessibilityLabel="result-preview-image"
            source={{ uri: props.uri }}
            testID="result-preview-image"
            resizeMode="contain"
            style={s.previewImage}
          />
        ) : (
          <View style={s.previewEmpty}>
            <Text style={s.previewEmptyTitle}>No output yet</Text>
            <Text style={s.previewEmptyText}>Ready for the next mark</Text>
          </View>
        )}
      </View>
    </View>
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

                {state.waterMarkType === 'text' ? (
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
                ) : (
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
                )}
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
  tabs: {
    backgroundColor: '#E6EDF2',
    borderColor: '#D6E0E6',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 12,
    padding: 3,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
  },
  tabSelected: {
    backgroundColor: '#0F172A',
  },
  tabText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
  tabTextSelected: {
    color: '#FFFFFF',
  },
  archPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE5EA',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 10,
  },
  archHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  archEyebrow: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  archTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  archModePill: {
    borderRadius: 7,
    borderWidth: 1,
    marginLeft: 10,
    maxWidth: width * 0.48,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  archModePillNew: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  archModePillLegacy: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  archModeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  archModeTextNew: {
    color: '#166534',
  },
  archModeTextLegacy: {
    color: '#92400E',
  },
  archSignals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -3,
    marginVertical: -3,
  },
  archSignal: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: 'row',
    margin: 3,
    minHeight: 32,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  archSignalDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 6,
    width: 8,
  },
  archSignalDotOn: {
    backgroundColor: '#16A34A',
  },
  archSignalDotOff: {
    backgroundColor: '#CBD5E1',
  },
  archSignalLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
  archSignalValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  archSignalValueOn: {
    color: '#15803D',
  },
  archSignalValueOff: {
    color: '#64748B',
  },
  previewPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE5EA',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  previewTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  previewSubtle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  previewActions: {
    alignItems: 'flex-end',
  },
  previewFrame: {
    alignItems: 'center',
    aspectRatio: 16 / 7,
    backgroundColor: '#E7EEF3',
    borderRadius: 6,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  previewFrameCompact: {
    aspectRatio: 16 / 5,
  },
  previewImage: {
    height: '100%',
    width: '100%',
  },
  previewEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  previewEmptyTitle: {
    color: '#334155',
    fontSize: 17,
    fontWeight: '800',
  },
  previewEmptyText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 4,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  featureList: {
    marginBottom: -8,
  },
  featureCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: '100%',
  },
  featureCard_blue: {
    borderColor: '#BFDBFE',
  },
  featureCard_green: {
    borderColor: '#BBF7D0',
  },
  featureCard_orange: {
    borderColor: '#FED7AA',
  },
  featureBadge: {
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '800',
    marginRight: 10,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'center',
    width: 64,
  },
  featureBadge_blue: {
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
  },
  featureBadge_green: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
  },
  featureBadge_orange: {
    backgroundColor: '#FFEDD5',
    color: '#C2410C',
  },
  featureTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  featureMeta: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 3,
  },
  featureCopy: {
    flex: 1,
    minWidth: 0,
  },
  featureRunPill: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  featureRunText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
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
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -3,
    marginVertical: -3,
  },
  chip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 7,
    borderWidth: 1,
    margin: 3,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  chipText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  inlineActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 4,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 7,
    justifyContent: 'center',
    margin: 4,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  buttonCompact: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonNeutral: {
    backgroundColor: '#E6EDF2',
  },
  buttonDanger: {
    backgroundColor: '#E11D48',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  buttonTextDark: {
    color: '#0F172A',
  },
  buttonWide: {
    flexBasis: 0,
    flexGrow: 1,
    minWidth: 150,
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
  field: {
    margin: 4,
  },
  fieldLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 7,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 15,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
  toggleRow: {
    alignItems: 'center',
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
  },
  toggleLabel: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
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
