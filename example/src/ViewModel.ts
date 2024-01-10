import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useActionSheet } from '@expo/react-native-action-sheet';
import Marker, {
  ImageFormat,
  Position,
  TextBackgroundType,
} from 'react-native-image-marker';
import RNBlobUtil from 'react-native-blob-util';
import filesize from 'filesize';

const icon = require('./icon.jpeg');
const icon1 = require('./yahaha.jpeg');
const bg = require('./bg.png');
const base64Bg = require('./bas64bg').default;

function useViewModel() {
  const { showActionSheetWithOptions } = useActionSheet();
  const [backgroundFormat, setBackgroundFormat] = useState<'image' | 'base64'>(
    'image'
  );
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
  const [X, setX] = useState<number | string>(20);
  const [Y, setY] = useState<number | string>(20);
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
  const [quality, setQuality] = useState(100);
  const [fileSize, setFileSize] = useState('0');
  const [fontSize, setFontSize] = useState(44);

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
        useModal: true,
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
        useModal: true,
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
        useModal: true,
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
    if (backgroundFormat === 'image') {
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
          quality,
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
                fontSize,
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
              text: `text marker normal`,
              positionOptions: {
                position: Position.center,
              },
              style: {
                color: '#FF00AA9F',
                fontName: 'NotoSansSC-Regular',
                fontSize,
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
          quality,
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
      const stat = await RNBlobUtil.fs.stat(path);
      setFileSize(filesize.filesize(stat.size));
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
              position: { X: 200, Y: 100 },
            },
          ],
          quality,
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
                fontName: 'NotoSansSC-Regular',
                fontSize,
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
                X: 500,
                Y: 600,
              },
              style: {
                underline: true,
                strikeThrough: true,
                bold: true,
                italic: true,
                color: '#FF0',
                fontSize,
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
                      // paddingX: 10,
                      // paddingY: 10,
                      padding: '10%',
                      color: '#0f09',
                    }
                  : null,
              },
            },
          ],
          quality,
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
      const stat = await RNBlobUtil.fs.stat(path);
      setFileSize(filesize.filesize(stat.size));
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
      quality,
      fileSize,
      fontSize,
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
    setWaterMarkType,
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
    setQuality,
    setFontSize,
    setBackgroundFormat,
  };
}

export default useViewModel;
