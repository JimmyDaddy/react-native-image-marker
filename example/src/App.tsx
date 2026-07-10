import React from 'react';
import { LogBox } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import RNBlobUtil from 'react-native-blob-util';

import ImageMarkerLab from './ImageMarkerLab';

const icon = require('./icon.jpeg');
const icon1 = require('./yahaha.jpeg');
const bg = require('./bg.png');
const orientationBg = require('./orientation-right.jpeg');
const base64Bg = require('./bas64bg').default;

LogBox.ignoreLogs(['RCTBridge required dispatch_sync to load']);

async function pickImage() {
  const response = await launchImageLibrary({
    quality: 0.5,
    mediaType: 'photo',
    maxWidth: 2000,
    maxHeight: 2000,
    selectionLimit: 1,
  });

  if (response.didCancel) {
    return null;
  }
  if (response.errorCode) {
    throw new Error(response.errorMessage ?? response.errorCode);
  }

  return response.assets?.[0]?.uri ?? null;
}

async function getFileSize(path: string) {
  const stat = await RNBlobUtil.fs.stat(path);
  return Number(stat.size);
}

async function readFileBase64(path: string) {
  return RNBlobUtil.fs.readFile(path, 'base64');
}

async function removeFile(path: string) {
  if (await RNBlobUtil.fs.exists(path)) {
    await RNBlobUtil.fs.unlink(path);
  }
}

function App() {
  return (
    <ImageMarkerLab
      assets={{ icon, icon1, bg, base64Bg, orientationBg }}
      backgroundFormats={['normal image', 'base64', 'rotated image']}
      featureVariant="orientation"
      getFileSize={getFileSize}
      pickImage={pickImage}
      readFileBase64={readFileBase64}
      removeFile={removeFile}
    />
  );
}

export default App;
