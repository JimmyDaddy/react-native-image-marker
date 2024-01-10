/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Switch,
  Modal,
  TextInput as RNTextInput,
} from 'react-native';
import { ImageFormat, TextBackgroundType } from 'react-native-image-marker';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import Toast from 'react-native-toast-message';
import { PaperProvider, Text } from 'react-native-paper';

import useViewModel from './ViewModel';
import RadioGroup from './components/RadioGroup';
import ImageOptions from './components/ImageOptions';
import TextOptions from './components/TextOptions';
import { Row, RowSplit } from './components/Row';

const { width, height } = Dimensions.get('window');

const s = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 30,
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
    padding: 0,
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
    height: 30,
    backgroundColor: '#ffA',
    borderColor: '#00B96B5A',
    borderWidth: 1,
    textAlign: 'center',
    padding: 0,
  },
  label: {
    marginRight: 2,
    textAlign: 'left',
  },
});

function App() {
  const {
    state,
    pickImage,
    mark,
    setUseTextShadow,
    setUseTextBgStyle,
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
    setQuality,
    setFontSize,
    setBackgroundFormat,
    setWaterMarkType,
    setSaveFormat,
  } = useViewModel();
  return (
    <ScrollView style={s.container}>
      <View style={s.op}>
        <Row>
          <RowSplit>
            <RadioGroup
              title="bg format"
              onValueChange={setBackgroundFormat}
              defaultValue={state.backgroundFormat}
              options={[
                { label: 'image', value: 'image', testID: 'bgImage' },
                { label: 'base64', value: 'base64', testID: 'bgBase64' },
              ]}
            />
          </RowSplit>
          <RowSplit>
            <RadioGroup
              title="watermark type"
              onValueChange={setWaterMarkType}
              defaultValue={state.waterMarkType}
              options={[
                { label: 'text', value: 'text', testID: 'textWatermark' },
                { label: 'image', value: 'image', testID: 'imageWatermark' },
              ]}
            />
          </RowSplit>
        </Row>
        <Row>
          <RadioGroup
            title="export result format: "
            onValueChange={setSaveFormat}
            defaultValue={state.saveFormat}
            subTitle='result format, default is "png"'
            options={[
              {
                label: 'png',
                value: ImageFormat.png,
                testID: 'exportFormatPng',
              },
              {
                label: 'jpg',
                value: ImageFormat.jpg,
                testID: 'exportFormatJpg',
              },
              {
                label: 'base64',
                value: ImageFormat.base64,
                testID: 'exportFormatBase64',
              },
            ]}
          />
        </Row>
      </View>
      <View style={s.op}>
        <Row>
          <ImageOptions
            pickerOptions={{
              label: 'select bg',
              testID: 'selectBgBtn',
              pickImage: () => pickImage('image'),
            }}
            rotate={{
              value: state.backgroundRotate,
              setValue: setBackgroundRotate,
              testID: 'bgRotate',
            }}
            scale={{
              value: state.backgroundScale,
              setValue: setBackgroundScale,
              testID: 'bgScale',
            }}
            alpha={{
              value: state.backgroundAlpha,
              setValue: setBackgroundAlpha,
              testID: 'bgAlpha',
            }}
            quality={{
              value: state.quality,
              setValue: setQuality,
              testID: 'bgQuality',
            }}
          />
        </Row>
        {state.waterMarkType === 'image' ? (
          <View style={s.op}>
            <ImageOptions
              pickerOptions={{
                label: 'select watermark icon',
                testID: 'selectWmBtn',
                pickImage: () => pickImage('mark'),
              }}
              rotate={{
                value: state.backgroundRotate,
                setValue: setWatermarkRotate,
                testID: 'wmRotate',
              }}
              scale={{
                value: state.backgroundScale,
                setValue: setWatermarkScale,
                testID: 'wmScale',
              }}
              alpha={{
                value: state.backgroundAlpha,
                setValue: setWatermarkAlpha,
                testID: 'wmAlpha',
              }}
            />
          </View>
        ) : (
          <Row style={{ flex: 2 }}>
            <TextOptions
              text={state.text}
              setText={setText}
              fontSize={state.fontSize}
              setFontSize={setFontSize}
              useTextBgStyle={state.useTextBgStyle}
              setUseTextBgStyle={setUseTextBgStyle}
              useTextShadow={state.useTextShadow}
              setUseTextShadow={setUseTextShadow}
              underline={state.underline}
              setUnderline={setUnderline}
              italic={state.italic}
              setItalic={setItalic}
              bold={state.bold}
              setBold={setBold}
              strikeThrough={state.strikeThrough}
              setStrikeThrough={setStrikeThrough}
            />
          </Row>
        )}
      </View>

      <View style={s.op}>
        <Row>
          <RowSplit>
            <Text style={s.label}>given position:</Text>
          </RowSplit>
          <RowSplit>
            <TouchableOpacity style={s.btn} onPress={showPositionSelector}>
              <Text style={s.text}>{state.position}</Text>
            </TouchableOpacity>
          </RowSplit>
        </Row>
        <Row>
          <RowSplit>
            <Text style={s.label}>custom x/y:</Text>
          </RowSplit>
          <RowSplit>
            <Text style={[s.label, { marginLeft: 5 }]}>X: </Text>
            <RNTextInput
              style={s.shortTextInput}
              value={String(state.X)}
              keyboardType="decimal-pad"
              onChangeText={(v) => setX(v)}
            />
            <Text style={[s.label, { marginLeft: 5 }]}>Y: </Text>
            <RNTextInput
              style={s.shortTextInput}
              keyboardType="decimal-pad"
              value={String(state.Y)}
              onChangeText={(v) => setY(v)}
            />
            <TouchableOpacity style={[s.btn, { marginLeft: 5 }]} onPress={mark}>
              <Text style={s.text}>mark</Text>
            </TouchableOpacity>
          </RowSplit>
        </Row>
      </View>
      <Modal
        animationType="slide"
        transparent
        visible={state.textOptionsVisible}
        statusBarTranslucent
      >
        <View style={s.modalContainer}>
          <View style={s.modalContent}>
            <Row>
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
            </Row>
            {state.useTextBgStyle ? (
              <Row>
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
              </Row>
            ) : null}
            <Row>
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
            </Row>
            <Row>
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
            </Row>
            <Row style={[{ justifyContent: 'flex-end' }]}>
              <RowSplit>
                <Text style={s.label}>rotate:</Text>
                <RNTextInput
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
              {/* <RowSplit>
                  
                </RowSplit> */}
              <TouchableOpacity
                style={[s.btn, { height: 40 }]}
                onPress={() => {
                  setTextOptionsVisible(false);
                }}
              >
                <Text style={s.text}>Confirm</Text>
              </TouchableOpacity>
            </Row>
          </View>
        </View>
      </Modal>
      <View style={{ flex: 1 }}>
        <Text testID="resultFileSizeLabel" style={{ marginBottom: 8 }}>
          result file size:{state.fileSize}
        </Text>
        <Text testID="resultFilePathLabel" style={{ marginBottom: 8 }}>
          file path:{state.uri}
        </Text>
        {state.show ? (
          <Image
            testID="resultImage"
            source={{ uri: state.uri }}
            resizeMode="contain"
            style={s.preview}
          />
        ) : null}
      </View>
      {state.loading && (
        <View style={s.loading}>
          <ActivityIndicator size="large" />
          <Text style={{ color: 'white' }}>loading...</Text>
        </View>
      )}
    </ScrollView>
  );
}

export default function AppContainer() {
  return (
    <ActionSheetProvider>
      <PaperProvider>
        <>
          <App />
          <Toast />
        </>
      </PaperProvider>
    </ActionSheetProvider>
  );
}
