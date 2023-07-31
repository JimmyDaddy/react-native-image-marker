import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
  TextInput,
  Switch,
  Modal,
} from 'react-native';
import Marker, {
  Position,
  ImageFormat,
  TextBackgroundType,
} from 'react-native-image-marker';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  ActionSheetProvider,
  useActionSheet,
} from '@expo/react-native-action-sheet';
import Toast from 'react-native-toast-message';

const icon = require('./icon.jpeg');
const icon1 = require('./yahaha.jpeg');
const bg = require('./bg.png');
const base64Bg = require('./bas64bg').default;

const { width, height } = Dimensions.get('window');

const s = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 50,
  },
  op: {
    marginTop: 10,
    justifyContent: 'center',
    flexWrap: 'wrap',
    backgroundColor: '#f1f1f1',
    alignItems: 'flex-start',
    paddingLeft: 10,
    paddingRight: 10,
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 5,
    flex: 1,
  },
  btn: {
    padding: 10,
    paddingTop: 5,
    paddingBottom: 5,
    borderRadius: 3,
    backgroundColor: '#00BF00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOp: {
    padding: 10,
    borderRadius: 3,
    backgroundColor: '#1A1AA1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 15,
    color: 'white',
  },
  preview: {
    width,
    height: 300,
    flex: 1,
    backgroundColor: '#ffffAA',
  },
  picker: {
    backgroundColor: '#00B96B5A',
    width: width - 20,
    height: 50,
  },
  textInput: {
    width: 110,
    height: 50,
    backgroundColor: '#ffA',
    borderColor: '#00B96B5A',
    borderWidth: 1,
  },
  loading: {
    position: 'absolute',
    width,
    height,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: height,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: width - 40,
    height: 300,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 10,
  },
  shortTextInput: {
    width: 20,
    height: 30,
    backgroundColor: '#ffA',
    borderColor: '#00B96B5A',
    borderWidth: 1,
    textAlign: 'center',
  },
  label: {
    marginRight: 2,
    textAlign: 'left',
  },
  rowSplit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
  },
});

function RowSplit(props: any) {
  return <View style={[s.rowSplit, props.style]}>{props.children}</View>;
}

function ImageOptions(props: {
  alpha: any;
  scale: any;
  rotate: any;
  setAlpha: (alpha: any) => void;
  setScale: (scale: any) => void;
  setRotate: (rotate: any) => void;
}) {
  const { alpha, scale, rotate, setAlpha, setScale, setRotate } = props;
  return (
    <View style={s.row}>
      <Text style={s.label}>scale:</Text>
      <TextInput
        style={s.shortTextInput}
        defaultValue={String(scale)}
        onChangeText={(v) => {
          const value = Number(v);
          if (value < 0 || value > 1) {
            Toast.show({
              type: 'error',
              text1: 'scale range error',
              text2: 'scale must be between 0 and 1',
            });
            return;
          }
          setScale(value);
        }}
      />
      <Text style={s.label}>alpha:</Text>
      <TextInput
        style={s.shortTextInput}
        defaultValue={String(alpha)}
        onChangeText={(v) => {
          const value = Number(v);
          if (value < 0 || value > 1) {
            Toast.show({
              type: 'error',
              text1: 'alpha range error',
              text2: 'alpha must be between 0 and 1',
            });
            return;
          }
          setAlpha(value);
        }}
      />
      <Text style={s.label}>rotate:</Text>
      <TextInput
        style={s.shortTextInput}
        defaultValue={String(rotate)}
        onChangeText={(v) => {
          const value = Number(v);
          if (value < -360 || value > 360) {
            Toast.show({
              type: 'error',
              text1: 'rotate range error',
              text2: 'rotate must be between -360 and 360',
            });
            return;
          }
          setRotate(value);
        }}
      />
    </View>
  );
}

function useViewModel() {
  const { showActionSheetWithOptions } = useActionSheet();
  const [backgroundFormat, setBackgroundFormat] = useState<
    'normal image' | 'base64'
  >('normal image');
  const [waterMarkType, setWaterMarkType] = useState<'text' | 'image'>('text');
  const [saveFormat, setSaveFormat] = useState<ImageFormat>(ImageFormat.png);
  const [image, setImage] = useState(bg);
  const [uri, setUri] = useState('');
  const [marker, setMarker] = useState(icon);
  const [text, setText] = useState('hello world \n 你好');
  const [useTextShadow, setUseTextShadow] = useState(true);
  const [useTextBgStyle, setUseTextBgStyle] = useState(true);
  const [textBgStretch, setTextBgStretch] = useState<TextBackgroundType>(
    TextBackgroundType.none
  );
  const [position, setPosition] = useState<Position>(Position.topLeft);
  const [X, setX] = useState<number>(20);
  const [Y, setY] = useState<number>(20);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [italic, setItalic] = useState(false);
  const [bold, setBold] = useState(false);
  const [strikeThrough, setStrikeThrough] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'right' | 'center'>(
    'left'
  );

  const [textRotate, setTextRotate] = useState(0);

  const [textOptionsVisible, setTextOptionsVisible] = useState(false);

  const [backgroundScale, setBackgroundScale] = useState(1);
  const [backgroundRotate, setBackgroundRotate] = useState(0);
  const [backgroundAlpha, setBackgroundAlpha] = useState(1);
  const [watermarkScale, setWatermarkScale] = useState(1);
  const [watermarkRotate, setWatermarkRotate] = useState(0);
  const [watermarkAlpha, setWatermarkAlpha] = useState(1);

  function showBackgroundFormatSelector() {
    const options = ['normal image', 'base64', 'cancel'];
    const cancelButtonIndex = 2;

    showActionSheetWithOptions(
      {
        options,
        title: 'select background format',
        cancelButtonIndex,
      },
      (buttonIndex) => {
        if (buttonIndex === cancelButtonIndex || buttonIndex == null) return;
        else setBackgroundFormat(options[buttonIndex] as any);
      }
    );
  }

  function showWatermarkTypeSelector() {
    const options = ['image', 'text', 'cancel'];
    const cancelButtonIndex = 2;

    showActionSheetWithOptions(
      {
        options,
        title: 'select watermark type',
        cancelButtonIndex,
      },
      (buttonIndex) => {
        if (buttonIndex === cancelButtonIndex || buttonIndex == null) return;
        else setWaterMarkType(options[buttonIndex] as any);
      }
    );
  }

  function showExportResultTypeSelector() {
    const options = [
      ImageFormat.png,
      ImageFormat.jpg,
      ImageFormat.base64,
      'cancel',
    ];
    const cancelButtonIndex = 3;

    showActionSheetWithOptions(
      {
        options,
        title: 'select export result format type',
        cancelButtonIndex,
      },
      (buttonIndex) => {
        if (buttonIndex === cancelButtonIndex || buttonIndex == null) return;
        else setSaveFormat(options[buttonIndex] as any);
      }
    );
  }

  function showPositionSelector() {
    const options = [
      Position.topLeft,
      Position.topCenter,
      Position.topRight,
      Position.center,
      Position.bottomLeft,
      Position.bottomCenter,
      Position.bottomRight,
      'cancel',
    ];
    const cancelButtonIndex = 7;

    showActionSheetWithOptions(
      {
        options,
        title: 'select export result format type',
        cancelButtonIndex,
      },
      (buttonIndex) => {
        if (buttonIndex === cancelButtonIndex || buttonIndex == null) return;
        else {
          setPosition(options[buttonIndex] as any);
        }
      }
    );
  }

  function showTextBgStretchSelector() {
    const options = [
      TextBackgroundType.none,
      TextBackgroundType.stretchX,
      TextBackgroundType.stretchY,
      'cancel',
    ];
    const cancelButtonIndex = 3;

    showActionSheetWithOptions(
      {
        options,
        title: 'select text bg stretch type',
        cancelButtonIndex,
      },
      (buttonIndex) => {
        if (buttonIndex === cancelButtonIndex || buttonIndex == null) return;
        else {
          setTextBgStretch(options[buttonIndex] as any);
        }
      }
    );
  }

  function showTextAlignSelector() {
    const options = ['left', 'right', 'center', 'cancel'];
    const cancelButtonIndex = 3;

    showActionSheetWithOptions(
      {
        options,
        title: 'select text align type',
        cancelButtonIndex,
      },
      (buttonIndex) => {
        if (buttonIndex === cancelButtonIndex || buttonIndex == null) return;
        else {
          setTextAlign(options[buttonIndex] as any);
        }
      }
    );
  }

  useEffect(() => {
    if (backgroundFormat === 'normal image') {
      setImage(bg);
    } else {
      setImage(base64Bg);
    }
  }, [backgroundFormat]);

  function showLoading() {
    setLoading(true);
  }

  async function markByPosition() {
    showLoading();
    let path = '';

    try {
      if (waterMarkType === 'image') {
        path = await Marker.markImage({
          backgroundImage: {
            src: image,
            scale: backgroundScale,
            alpha: backgroundAlpha,
            rotate: backgroundRotate,
          },
          watermarkImage: {
            src: marker,
            scale: watermarkScale,
            alpha: watermarkAlpha,
            rotate: watermarkRotate,
          },
          watermarkPositions: {
            position,
          },
          quality: 100,
          saveFormat: saveFormat,
          watermarkImages: [
            {
              src: icon1,
              scale: watermarkScale,
              alpha: watermarkAlpha,
              rotate: watermarkRotate,
              position: {
                position: Position.topLeft,
              },
            },
            {
              src: marker,
              scale: watermarkScale,
              alpha: watermarkAlpha,
              rotate: watermarkRotate,
              position: {
                position: Position.topRight,
              },
            },
          ],
        });
      } else {
        path = await Marker.markText({
          backgroundImage: {
            src: image,
            scale: backgroundScale,
            alpha: backgroundAlpha,
            rotate: backgroundRotate,
          },
          watermarkTexts: [
            {
              text,
              positionOptions: {
                position,
              },
              style: {
                color: '#FF0000AA',
                fontName: 'Arial',
                fontSize: 44,
                underline,
                bold,
                italic,
                strikeThrough,
                textAlign: textAlign,
                rotate: textRotate,
                shadowStyle: useTextShadow
                  ? {
                      dx: 10.5,
                      dy: 20.8,
                      radius: 20.9,
                      color: '#0000FF',
                    }
                  : null,
                textBackgroundStyle: useTextBgStyle
                  ? {
                      type: textBgStretch,
                      paddingX: 10,
                      paddingY: 10,
                      color: '#0f0A',
                    }
                  : null,
              },
            },
            {
              text: `text marker normal`,
              positionOptions: {
                position: Position.center,
              },
              style: {
                color: '#FF00AA9F',
                fontName: 'STSongti-SC-Regular',
                fontSize: 44,
                underline,
                bold,
                italic,
                strikeThrough,
                textAlign: textAlign,
                rotate: textRotate,
                shadowStyle: useTextShadow
                  ? {
                      dx: 10.5,
                      dy: 20.8,
                      radius: 20.9,
                      color: '#00EEFF',
                    }
                  : null,
                textBackgroundStyle: useTextBgStyle
                  ? {
                      type: textBgStretch,
                      paddingX: 10,
                      paddingY: 10,
                      color: '#0fA',
                    }
                  : null,
              },
            },
          ],
          quality: 100,
          saveFormat: saveFormat,
        });
      }
      setUri(
        saveFormat === ImageFormat.base64
          ? path
          : Platform.OS === 'android'
          ? 'file:' + path
          : path
      );
      setLoading(false);
      setShow(true);
    } catch (err) {
      console.log('====================================');
      console.log(err, 'err');
      console.log('====================================');
    }
  }

  useEffect(() => {
    if (position) {
      markByPosition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  async function mark() {
    showLoading();
    let path = '';
    try {
      if (waterMarkType === 'image') {
        path = await Marker.markImage({
          backgroundImage: {
            src: image,
            scale: backgroundScale,
            rotate: backgroundRotate,
            alpha: backgroundAlpha,
          },
          watermarkImages: [
            {
              src: marker,
              scale: watermarkScale,
              alpha: watermarkAlpha,
              rotate: watermarkRotate,
              position: { X, Y },
            },
            {
              src: icon1,
              scale: watermarkScale,
              alpha: watermarkAlpha,
              rotate: watermarkRotate,
              position: { X: X + 200, Y: Y + 100 },
            },
          ],
          quality: 100,
          saveFormat: saveFormat,
        });
      } else {
        path = await Marker.markText({
          backgroundImage: {
            src: image,
            scale: backgroundScale,
            alpha: backgroundAlpha,
            rotate: backgroundRotate,
          },
          watermarkTexts: [
            {
              text,
              positionOptions: {
                X,
                Y,
              },
              style: {
                underline,
                strikeThrough,
                color: '#FF0',
                fontName: 'STSongti-SC-Regular',
                fontSize: 44,
                bold,
                italic,
                textAlign: textAlign,
                rotate: textRotate,
                shadowStyle: useTextShadow
                  ? {
                      dx: 10.5,
                      dy: 20.8,
                      radius: 20.9,
                      color: '#0000FF',
                    }
                  : null,
                textBackgroundStyle: useTextBgStyle
                  ? {
                      type: textBgStretch,
                      paddingX: 10,
                      paddingY: 10,
                      color: '#00B96B',
                    }
                  : null,
              },
            },
            {
              text,
              positionOptions: {
                X: X + 500,
                Y: Y + 600,
              },
              style: {
                underline: true,
                strikeThrough: true,
                bold: true,
                italic: true,
                color: '#FF0',
                fontSize: 44,
                textAlign: textAlign,
                rotate: textRotate,
                shadowStyle: useTextShadow
                  ? {
                      dx: 10.5,
                      dy: 20.8,
                      radius: 20.9,
                      color: '#0000FF',
                    }
                  : null,
                textBackgroundStyle: useTextBgStyle
                  ? {
                      type: textBgStretch,
                      paddingX: 10,
                      paddingY: 10,
                      color: '#0f09',
                    }
                  : null,
              },
            },
          ],
          quality: 100,
          saveFormat: saveFormat,
        });
      }
      setUri(
        saveFormat === ImageFormat.base64
          ? path
          : Platform.OS === 'android'
          ? 'file:' + path
          : path
      );
      setShow(true);
      setLoading(false);
    } catch (error) {
      console.log('====================================');
      console.log(error, 'error');
      console.log('====================================');
    }
  }

  async function pickImage(type: any) {
    const response = await launchImageLibrary({
      quality: 0.5,
      mediaType: 'photo',
      maxWidth: 2000,
      maxHeight: 2000,
      selectionLimit: 1,
    });

    if (response.didCancel) {
      console.log('User cancelled photo picker');
    } else if (response.errorCode) {
      console.log('ImagePickerManager Error: ', response.errorMessage);
    } else {
      // You can display the image using either:
      // const source = {uri: 'data:image/jpeg;base64,' + response.data, isStatic: true};
      const myUri = response.assets?.[0]?.uri;
      if (type === 'image') {
        setImage(myUri);
      } else {
        setMarker(myUri);
      }
    }
  }

  return {
    state: {
      image,
      uri,
      marker,
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
    },
    setLoading,
    setImage,
    setMarker,
    setShow,
    setUri,
    setSaveFormat,
    setUseTextShadow,
    setUseTextBgStyle,
    setTextBgStretch,
    mark,
    markByPosition,
    pickImage,
    showBackgroundFormatSelector,
    showWatermarkTypeSelector,
    showExportResultTypeSelector,
    setText,
    showPositionSelector,
    showTextBgStretchSelector,
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
    showTextAlignSelector,
  };
}

function App() {
  const {
    state,
    pickImage,
    mark,
    setUseTextShadow,
    setUseTextBgStyle,
    showBackgroundFormatSelector,
    showWatermarkTypeSelector,
    showExportResultTypeSelector,
    setText,
    showPositionSelector,
    showTextBgStretchSelector,
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
    showTextAlignSelector,
    setTextRotate,
  } = useViewModel();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={s.container}>
        <View style={s.op}>
          <View style={s.row}>
            <RowSplit>
              <Text style={s.label}>background image format:</Text>
            </RowSplit>
            <RowSplit>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: '#FF7043' }]}
                onPress={showBackgroundFormatSelector}
              >
                <Text style={s.text}>{state.backgroundFormat}</Text>
              </TouchableOpacity>
            </RowSplit>
          </View>
          <View style={s.row}>
            <RowSplit>
              <Text style={s.label}>watermark type:</Text>
            </RowSplit>
            <RowSplit>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: '#FF7043' }]}
                onPress={showWatermarkTypeSelector}
              >
                <Text style={s.text}>{state.waterMarkType}</Text>
              </TouchableOpacity>
            </RowSplit>
          </View>
          <View style={s.row}>
            <RowSplit>
              <Text style={s.label}>export result format:</Text>
            </RowSplit>
            <RowSplit>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: '#FF7043' }]}
                onPress={showExportResultTypeSelector}
              >
                <Text style={s.text}>{state.saveFormat}</Text>
              </TouchableOpacity>
            </RowSplit>
          </View>
        </View>
        <View style={s.op}>
          <View style={s.row}>
            <RowSplit>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: '#2296F3' }]}
                onPress={() => pickImage('image')}
              >
                <Text style={s.text}>select background</Text>
              </TouchableOpacity>
            </RowSplit>
            <RowSplit>
              <ImageOptions
                rotate={state.backgroundRotate}
                scale={state.backgroundScale}
                alpha={state.backgroundAlpha}
                setAlpha={setBackgroundAlpha}
                setRotate={setBackgroundRotate}
                setScale={setBackgroundScale}
              />
            </RowSplit>
          </View>
          <View style={s.row}>
            {state.waterMarkType === 'image' ? (
              <View style={s.row}>
                <RowSplit>
                  <TouchableOpacity
                    style={[s.btn, { backgroundColor: '#2296F3' }]}
                    onPress={() => pickImage('mark')}
                  >
                    <Text style={s.text}>select watermark icon</Text>
                  </TouchableOpacity>
                </RowSplit>
                <RowSplit>
                  <ImageOptions
                    rotate={state.watermarkScale}
                    scale={state.watermarkScale}
                    alpha={state.watermarkAlpha}
                    setAlpha={setWatermarkAlpha}
                    setRotate={setWatermarkRotate}
                    setScale={setWatermarkScale}
                  />
                </RowSplit>
              </View>
            ) : (
              <View style={s.row}>
                <RowSplit>
                  <Text style={s.label}>text watermark:</Text>
                </RowSplit>
                <RowSplit>
                  <TextInput
                    placeholder="input text for watermark"
                    style={s.textInput}
                    onChangeText={setText}
                    value={state.text}
                    multiline
                  />
                  <TouchableOpacity
                    style={[s.btn, { marginLeft: 5 }]}
                    onPress={() => setTextOptionsVisible(true)}
                  >
                    <Text style={s.text}>options</Text>
                  </TouchableOpacity>
                </RowSplit>
              </View>
            )}
          </View>
        </View>
        <View style={s.op}>
          <View style={s.row}>
            <RowSplit>
              <Text style={s.label}>with given position:</Text>
            </RowSplit>
            <RowSplit>
              <TouchableOpacity style={s.btn} onPress={showPositionSelector}>
                <Text style={s.text}>{state.position}</Text>
              </TouchableOpacity>
            </RowSplit>
          </View>
          <View style={s.row}>
            <RowSplit>
              <Text style={s.label}>with custom x/y:</Text>
            </RowSplit>
            <RowSplit>
              <Text style={[s.label, { marginLeft: 5 }]}>X: </Text>
              <TextInput
                style={s.shortTextInput}
                keyboardType="numeric"
                value={String(state.X)}
                onChangeText={(v) => setX(Number(v))}
              />
              <Text style={[s.label, { marginLeft: 5 }]}>Y: </Text>
              <TextInput
                style={s.shortTextInput}
                keyboardType="numeric"
                value={String(state.Y)}
                onChangeText={(v) => setY(Number(v))}
              />
              <TouchableOpacity
                style={[s.btn, { marginLeft: 5 }]}
                onPress={mark}
              >
                <Text style={s.text}>mark</Text>
              </TouchableOpacity>
            </RowSplit>
          </View>
        </View>
        <Modal
          animationType="slide"
          transparent
          visible={state.textOptionsVisible}
          statusBarTranslucent
        >
          <View style={s.modalContainer}>
            <View style={s.modalContent}>
              <View style={s.row}>
                <RowSplit>
                  <Text style={s.label}>text shadow:</Text>
                  <Switch
                    value={state.useTextShadow}
                    onValueChange={setUseTextShadow}
                  />
                </RowSplit>
                <RowSplit>
                  <Text style={s.label}>text background:</Text>
                  <Switch
                    value={state.useTextBgStyle}
                    onValueChange={setUseTextBgStyle}
                  />
                </RowSplit>
              </View>
              {state.useTextBgStyle ? (
                <View style={s.row}>
                  <RowSplit>
                    <Text style={s.label}>text bg stretch:</Text>
                    <TouchableOpacity
                      style={s.btn}
                      onPress={showTextBgStretchSelector}
                    >
                      <Text style={s.text}>
                        {state.textBgStretch == null ||
                        state.textBgStretch === TextBackgroundType.none
                          ? 'fit'
                          : state.textBgStretch}
                      </Text>
                    </TouchableOpacity>
                  </RowSplit>
                  <RowSplit>
                    <Text style={s.label}>text align:</Text>
                    <TouchableOpacity
                      style={s.btn}
                      onPress={showTextAlignSelector}
                    >
                      <Text style={s.text}>{state.textAlign}</Text>
                    </TouchableOpacity>
                  </RowSplit>
                </View>
              ) : null}
              <View style={s.row}>
                <RowSplit>
                  <RowSplit style={{ flex: 2 }}>
                    <Text style={s.label}>underline:</Text>
                  </RowSplit>
                  <RowSplit>
                    <Switch
                      value={state.underline}
                      onValueChange={setUnderline}
                    />
                  </RowSplit>
                </RowSplit>
                <RowSplit>
                  <RowSplit style={{ flex: 2 }}>
                    <Text style={s.label}>italic:</Text>
                  </RowSplit>
                  <RowSplit>
                    <Switch value={state.italic} onValueChange={setItalic} />
                  </RowSplit>
                </RowSplit>
              </View>
              <View style={s.row}>
                <RowSplit>
                  <RowSplit style={{ flex: 2 }}>
                    <Text style={s.label}>bold:</Text>
                  </RowSplit>
                  <RowSplit>
                    <Switch value={state.bold} onValueChange={setBold} />
                  </RowSplit>
                </RowSplit>
                <RowSplit>
                  <RowSplit style={{ flex: 2 }}>
                    <Text style={s.label}>strikeThrough:</Text>
                  </RowSplit>
                  <RowSplit>
                    <Switch
                      value={state.strikeThrough}
                      onValueChange={setStrikeThrough}
                    />
                  </RowSplit>
                </RowSplit>
              </View>
              <View style={[s.row, { justifyContent: 'flex-end' }]}>
                <RowSplit>
                  <Text style={s.label}>rotate:</Text>
                  <TextInput
                    style={s.shortTextInput}
                    defaultValue={String(state.textRotate)}
                    onChangeText={(v) => {
                      const value = Number(v);
                      if (value < -360 || value > 360) {
                        Toast.show({
                          type: 'error',
                          text1: 'rotate range error',
                          text2: 'rotate must be between -360 and 360',
                        });
                        return;
                      }
                      setTextRotate(value);
                    }}
                  />
                </RowSplit>
                <TouchableOpacity
                  style={[s.btn, { height: 40 }]}
                  onPress={() => {
                    setTextOptionsVisible(false);
                  }}
                >
                  <Text style={s.text}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <View style={{ flex: 1 }}>
          {state.show ? (
            <Image
              source={{ uri: state.uri }}
              resizeMode="contain"
              style={s.preview}
            />
          ) : null}
        </View>
      </ScrollView>
      {state.loading && (
        <View style={s.loading}>
          <ActivityIndicator size="large" />
          <Text style={{ color: 'white' }}>loading...</Text>
        </View>
      )}
    </View>
  );
}

export default function AppContainer() {
  return (
    <ActionSheetProvider>
      <>
        <App />
        <Toast />
      </>
    </ActionSheetProvider>
  );
}
