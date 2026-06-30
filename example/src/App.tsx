import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  LogBox,
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
import { launchImageLibrary } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import RNBlobUtil from 'react-native-blob-util';
import filesize from 'filesize';

const icon = require('./icon.jpeg');
const icon1 = require('./yahaha.jpeg');
const bg = require('./bg.png');
const orientationBg = require('./orientation-right.jpeg');
const base64Bg = require('./bas64bg').default;

const { width } = Dimensions.get('window');

LogBox.ignoreLogs(['RCTBridge required dispatch_sync to load']);

type BackgroundFormat =
  | 'normal image'
  | 'base64'
  | 'orientation image'
  | 'picked image';
type WatermarkType = 'text' | 'image';
type RunMode = 'anchorOffset' | 'absoluteXY';
type OffsetValue = number | string;

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

const backgroundFormats: BackgroundFormat[] = [
  'normal image',
  'base64',
  'orientation image',
];

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

const exampleFontName = 'MaShanZheng-Regular';

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

function sourceFromBackgroundFormat(format: BackgroundFormat) {
  switch (format) {
    case 'base64':
      return base64Bg;
    case 'orientation image':
      return orientationBg;
    case 'normal image':
    case 'picked image':
      return bg;
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
        style={s.input}
        value={String(props.value)}
        onChangeText={props.onChange}
        keyboardType="default"
        selectTextOnFocus
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

function useViewModel() {
  const [backgroundFormat, setBackgroundFormat] =
    useState<BackgroundFormat>('normal image');
  const [waterMarkType, setWaterMarkType] = useState<WatermarkType>('text');
  const [saveFormat, setSaveFormat] = useState<ImageFormat>(ImageFormat.png);
  const [image, setImage] = useState<unknown>(bg);
  const [uri, setUri] = useState('');
  const [marker, setMarker] = useState<unknown>(icon);
  const [text, setText] = useState('#270 anchor + offset');
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
      setImage(sourceFromBackgroundFormat(backgroundFormat));
    }
  }, [backgroundFormat]);

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
      setFileSize(filesize.filesize(path.length));
      return;
    }

    const stat = await RNBlobUtil.fs.stat(path);
    setFileSize(filesize.filesize(stat.size));
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
    const response = await launchImageLibrary({
      quality: 0.5,
      mediaType: 'photo',
      maxWidth: 2000,
      maxHeight: 2000,
      selectionLimit: 1,
    });

    if (response.didCancel) {
      return;
    }
    if (response.errorCode) {
      Toast.show({
        type: 'error',
        text1: 'image picker error',
        text2: response.errorMessage,
      });
      return;
    }

    const selectedUri = response.assets?.[0]?.uri;
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

  function runTextOffsetRegression() {
    setBackgroundFormat('normal image');
    runMark(
      'anchorOffset',
      {
        image: bg,
        marker: icon,
        waterMarkType: 'text',
        text: '#270 text offset',
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
      '#270 text anchor offset'
    );
  }

  function runImageOffsetRegression() {
    setBackgroundFormat('normal image');
    runMark(
      'anchorOffset',
      {
        image: bg,
        marker: icon1,
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
      '#270 image anchor offset'
    );
  }

  function runOrientationRegression() {
    setBackgroundFormat('orientation image');
    runMark(
      'anchorOffset',
      {
        image: orientationBg,
        marker: icon,
        waterMarkType: 'text',
        text: '#223 orientation',
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
      '#223 iOS orientation'
    );
  }

  async function runLegacyPositionSamples() {
    const nextConfig = config;
    setLastRun('Legacy position samples');
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
                  src: icon1,
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
      console.log('legacy position samples error', error);
      Toast.show({
        type: 'error',
        text1: 'legacy position failed',
        text2: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function runLegacyAbsoluteSamples() {
    const nextConfig = config;
    setLastRun('Legacy absolute samples');
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
                  src: icon1,
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
      console.log('legacy absolute samples error', error);
      Toast.show({
        type: 'error',
        text1: 'legacy absolute failed',
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
      runTextOffsetRegression,
      runImageOffsetRegression,
      runOrientationRegression,
      runLegacyPositionSamples,
      runLegacyAbsoluteSamples,
      clearResult: () => {
        setUri('');
        setShow(false);
        setFileSize('0 B');
        setLastRun('Ready');
      },
    },
  };
}

function RegressionCard(props: {
  issue: string;
  title: string;
  meta: string;
  tone: 'blue' | 'green' | 'orange';
  onPress: () => void;
  testID: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      accessibilityLabel={props.title}
      accessibilityRole="button"
      onPress={props.onPress}
      style={[s.regressionCard, s[`regressionCard_${props.tone}`]]}
      testID={props.testID}
    >
      <Text style={[s.regressionIssue, s[`regressionIssue_${props.tone}`]]}>
        {props.issue}
      </Text>
      <Text style={s.regressionTitle}>{props.title}</Text>
      <Text style={s.regressionMeta}>{props.meta}</Text>
    </TouchableOpacity>
  );
}

function App() {
  const { state, actions } = useViewModel();

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <View style={s.headerCopy}>
            <Text style={s.eyebrow}>react-native-image-marker</Text>
            <Text style={s.title}>Manual test bench</Text>
          </View>
          <View style={s.statusPill}>
            <Text style={s.statusText}>{state.lastRun}</Text>
          </View>
        </View>

        <View style={s.previewPanel}>
          <View style={s.previewHeader}>
            <View>
              <Text style={s.previewTitle}>Result preview</Text>
              <Text style={s.previewSubtle}>Size {state.fileSize}</Text>
            </View>
            <View style={s.previewActions}>
              <AppButton
                compact
                label="Clear"
                tone="neutral"
                onPress={actions.clearResult}
              />
            </View>
          </View>
          <View
            accessibilityLabel={
              state.show ? 'result-preview-ready' : 'result-preview-empty'
            }
            accessible
            style={s.previewFrame}
            testID={
              state.show ? 'result-preview-ready' : 'result-preview-empty'
            }
          >
            {state.show ? (
              <Image
                accessible
                accessibilityLabel="result-preview-image"
                source={{ uri: state.uri }}
                testID="result-preview-image"
                resizeMode="contain"
                style={s.previewImage}
              />
            ) : (
              <View style={s.previewEmpty}>
                <Text style={s.previewEmptyTitle}>No output yet</Text>
                <Text style={s.previewEmptyText}>Run a case below</Text>
              </View>
            )}
          </View>
        </View>

        <Section title="Regression cases">
          <View style={s.regressionGrid}>
            <RegressionCard
              issue="#270"
              title="Text anchor offset"
              meta="topRight + X/Y"
              tone="blue"
              testID="regression-text-anchor-offset"
              onPress={actions.runTextOffsetRegression}
            />
            <RegressionCard
              issue="#270"
              title="Image anchor offset"
              meta="bottomRight + X/Y"
              tone="green"
              testID="regression-image-anchor-offset"
              onPress={actions.runImageOffsetRegression}
            />
            <RegressionCard
              issue="#223"
              title="iOS orientation"
              meta="EXIF orientation=6"
              tone="orange"
              testID="regression-ios-orientation"
              onPress={actions.runOrientationRegression}
            />
          </View>
        </Section>

        <Section title="Base API coverage">
          <View style={s.controlPanel}>
            <View style={s.runRow}>
              <AppButton
                label="Run legacy position"
                testID="legacy-position-samples"
                onPress={actions.runLegacyPositionSamples}
              />
              <AppButton
                label="Run legacy absolute X/Y"
                tone="neutral"
                testID="legacy-absolute-samples"
                onPress={actions.runLegacyAbsoluteSamples}
              />
            </View>
          </View>
        </Section>

        <Section title="Input source">
          <View style={s.controlPanel}>
            <View style={s.controlRow}>
              <Text style={s.controlLabel}>Background</Text>
              <ChipGroup
                options={backgroundFormats}
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
            <View style={s.fieldGrid}>
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
              <View style={s.outputFormat}>
                <Text style={s.fieldLabel}>Output</Text>
                <ChipGroup
                  options={saveFormats}
                  value={state.saveFormat}
                  onChange={actions.setSaveFormat}
                />
              </View>
            </View>
            <View style={s.runRow}>
              <AppButton
                label="Run anchor + offset"
                onPress={() => {
                  actions.runMark('anchorOffset');
                }}
              />
              <AppButton
                label="Run absolute X/Y"
                tone="neutral"
                onPress={() => {
                  actions.runMark('absoluteXY');
                }}
              />
            </View>
          </View>
        </Section>
      </ScrollView>

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

export default App;

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
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
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0,
    marginTop: 4,
  },
  statusPill: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: width * 0.42,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusText: {
    color: '#075985',
    fontSize: 12,
    fontWeight: '700',
  },
  previewPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 18,
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  previewTitle: {
    color: '#0F172A',
    fontSize: 17,
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
    aspectRatio: 16 / 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
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
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  regressionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  regressionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    margin: 4,
    minHeight: 112,
    padding: 12,
    width: width < 430 ? '100%' : '31%',
  },
  regressionCard_blue: {
    borderColor: '#BFDBFE',
  },
  regressionCard_green: {
    borderColor: '#BBF7D0',
  },
  regressionCard_orange: {
    borderColor: '#FED7AA',
  },
  regressionIssue: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  regressionIssue_blue: {
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
  },
  regressionIssue_green: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
  },
  regressionIssue_orange: {
    backgroundColor: '#FFEDD5',
    color: '#C2410C',
  },
  regressionTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  regressionMeta: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 4,
  },
  controlPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  controlRow: {
    marginBottom: 12,
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
    borderRadius: 8,
    borderWidth: 1,
    margin: 3,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
    borderRadius: 8,
    justifyContent: 'center',
    margin: 4,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonCompact: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonNeutral: {
    backgroundColor: '#E2E8F0',
  },
  buttonDanger: {
    backgroundColor: '#E11D48',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  buttonTextDark: {
    color: '#0F172A',
  },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 8,
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
    borderRadius: 8,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 15,
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  textEditor: {
    marginTop: 2,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 15,
    minHeight: 88,
    paddingHorizontal: 10,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  outputFormat: {
    flex: 1,
    margin: 4,
    minWidth: 180,
  },
  runRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 10,
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
