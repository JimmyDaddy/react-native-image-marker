import React, { useState } from 'react';
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
} from 'react-native';
import Marker, {
  Position,
  ImageFormat,
  TextBackgroundType,
} from 'react-native-image-marker';
import { launchImageLibrary } from 'react-native-image-picker';

const icon = require('./icon.jpeg');
const bg = require('./bg.png');
const base64Bg = require('./bas64bg').default;

const { width, height } = Dimensions.get('window');

const s = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
  },
  op: {
    marginTop: 20,
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#f1f1f1',
    padding: 10,
  },
  btn: {
    padding: 10,
    borderRadius: 3,
    backgroundColor: '#00BF00',
    margin: 5,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOp: {
    padding: 10,
    borderRadius: 3,
    backgroundColor: '#1A1AA1',
    margin: 5,
    marginTop: 10,
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
    backgroundColor: 'red',
  },
});

function useViewModel() {
  const [base64, setBase64] = useState(false);
  const [markImage, setMarkImage] = useState(true);
  const [saveFormat, setSaveFormat] = useState(ImageFormat.png);
  const [image, setImage] = useState(bg);
  const [uri, setUri] = useState('');
  const [marker, setMarker] = useState(icon);
  const [useTextShadow, setUseTextShadow] = useState(true);
  const [useTextBgStyle, setUseTextBgStyle] = useState(true);
  const [textBgStretch, setTextBgStretch] = useState<TextBackgroundType>(
    TextBackgroundType.none
  );
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  function switchMarkType() {
    setMarkImage(!markImage);
  }

  function switchBg() {
    setBase64(!base64);
    setImage(base64 ? base64Bg : bg);
  }

  function switchBase64Res() {
    setSaveFormat(
      saveFormat === ImageFormat.base64 ? ImageFormat.png : ImageFormat.base64
    );
  }

  function showLoading() {
    setLoading(true);
  }

  async function markByPosition(positionType: Position) {
    showLoading();
    let path = '';

    try {
      if (markImage) {
        path = await Marker.markImage({
          src: image,
          markerSrc: marker,
          position: positionType,
          scale: 1,
          markerScale: 1,
          quality: 100,
          saveFormat: saveFormat,
        });
      } else {
        path = await Marker.markText({
          src: image,
          text: `text marker \n muiltline text`,
          position: positionType,
          color: '#FF0000AA',
          fontName: 'Arial-BoldItalicMT',
          fontSize: 44,
          scale: 1,
          quality: 100,
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

  async function mark() {
    showLoading();
    let path = '';
    try {
      if (markImage) {
        path = await Marker.markImage({
          src: image,
          markerSrc: marker,
          X: 100,
          Y: 150,
          scale: 1,
          markerScale: 0.5,
          quality: 100,
          saveFormat: saveFormat,
        });
      } else {
        path = await Marker.markText({
          src: image,
          text: 'text marker \n muiltline text',
          X: 30,
          Y: 30,
          color: '#FF0',
          fontName: 'Arial-BoldItalicMT',
          fontSize: 44,
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
                color: '#0f0',
              }
            : null,
          scale: 1,
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
      markImage,
      base64,
      saveFormat,
      useTextShadow,
      useTextBgStyle,
      textBgStretch,
    },
    setBase64,
    setLoading,
    setImage,
    setMarker,
    setShow,
    setUri,
    setMarkImage,
    setSaveFormat,
    setUseTextShadow,
    setUseTextBgStyle,
    setTextBgStretch,
    mark,
    markByPosition,
    pickImage,
    switchBg,
    switchMarkType,
    switchBase64Res,
  };
}

export default function App() {
  const {
    state,
    switchBg,
    switchMarkType,
    switchBase64Res,
    pickImage,
    mark,
    markByPosition,
    setUseTextShadow,
    setUseTextBgStyle,
    setTextBgStretch,
  } = useViewModel();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={s.container}>
        <View>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: '#FF7043' }]}
            onPress={switchBg}
          >
            <Text style={s.text}>
              {' '}
              use {state.base64 ? 'base64' : 'image'} as background
            </Text>
          </TouchableOpacity>
        </View>
        <View>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: '#FF7043' }]}
            onPress={switchMarkType}
          >
            <Text style={s.text}>
              switch to mark {state.markImage ? 'text' : 'image'}
            </Text>
          </TouchableOpacity>
        </View>
        <View>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: '#FF7043' }]}
            onPress={switchBase64Res}
          >
            <Text style={s.text}>
              export{' '}
              {state.saveFormat === ImageFormat.base64 ? 'base64' : 'png'}{' '}
              result
            </Text>
          </TouchableOpacity>
        </View>
        <View>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: '#2296F3' }]}
            onPress={() => pickImage('image')}
          >
            <Text style={s.text}>pick image</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: '#2296F3' }]}
            onPress={() => pickImage('mark')}
          >
            <Text style={s.text}>pick an image for mark</Text>
          </TouchableOpacity>
        </View>
        <View style={s.op}>
          <TouchableOpacity style={s.btn} onPress={mark}>
            <Text style={s.text}>mark</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btn}
            onPress={() => markByPosition(Position.topLeft)}
          >
            <Text style={s.text}>TopLeft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btn}
            onPress={() => markByPosition(Position.topCenter)}
          >
            <Text style={s.text}>topCenter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btn}
            onPress={() => markByPosition(Position.topRight)}
          >
            <Text style={s.text}>topRight</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btn}
            onPress={() => markByPosition(Position.center)}
          >
            <Text style={s.text}>Center</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btn}
            onPress={() => markByPosition(Position.bottomLeft)}
          >
            <Text style={s.text}>bottomLeft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btn}
            onPress={() => markByPosition(Position.bottomCenter)}
          >
            <Text style={s.text}>bottomCenter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.btn}
            onPress={() => markByPosition(Position.bottomRight)}
          >
            <Text style={s.text}>bottomRight</Text>
          </TouchableOpacity>
        </View>
        {!state.markImage ? (
          <View style={s.op}>
            <TouchableOpacity
              style={s.btnOp}
              onPress={() => {
                setUseTextShadow(!state.useTextShadow);
              }}
            >
              <Text style={s.text}>
                textShadow {state.useTextShadow ? 'on' : 'off'}{' '}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.btnOp}
              onPress={() => {
                setUseTextBgStyle(!state.useTextBgStyle);
              }}
            >
              <Text style={s.text}>
                textBg {state.useTextBgStyle ? 'on' : 'off'}{' '}
              </Text>
            </TouchableOpacity>
            {state.useTextBgStyle ? (
              <TouchableOpacity
                style={s.btnOp}
                onPress={() => {
                  setTextBgStretch(
                    state.textBgStretch === TextBackgroundType.stretchY
                      ? TextBackgroundType.none
                      : TextBackgroundType.stretchX
                  );
                }}
              >
                <Text style={s.text}>
                  text bg stretch:{' '}
                  {state.textBgStretch == null ? 'fit' : state.textBgStretch}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
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
        <View
          style={{
            position: 'absolute',
            width,
            height,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" />
          <Text style={{ color: 'white' }}>loading...</Text>
        </View>
      )}
    </View>
  );
}
