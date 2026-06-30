import React from 'react';
import * as FileSystem from 'expo-file-system';
import { launchImageLibraryAsync, MediaTypeOptions } from 'expo-image-picker';

import ImageMarkerLab from '../example/src/ImageMarkerLab';

const icon = require('./assets/icon.jpeg');
const icon1 = require('./assets/yahaha.jpeg');
const bg = require('./assets/bg.png');
const base64Bg = require('./assets/bas64bg').default;

async function pickImage() {
  const response = await launchImageLibraryAsync({
    quality: 0.5,
    mediaTypes: MediaTypeOptions.Images,
    allowsEditing: false,
    selectionLimit: 1,
  });

  if (response.canceled) {
    return null;
  }

  return response.assets?.[0]?.uri ?? null;
}

async function getFileSize(path: string) {
  const stat = await FileSystem.getInfoAsync(path);
  return stat.exists ? Number((stat as { size?: number }).size ?? 0) : 0;
}

function App() {
  return (
    <ImageMarkerLab
      assets={{ icon, icon1, bg, base64Bg }}
      backgroundFormats={['normal image', 'base64']}
      featureVariant="base64"
      getFileSize={getFileSize}
      pickImage={pickImage}
    />
  );
}

export default App;
