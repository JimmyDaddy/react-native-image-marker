import React from 'react';
import {
  LogBox,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import RNBlobUtil from 'react-native-blob-util';

import ImageMarkerLab from './ImageMarkerLab';
import EditorExample from './EditorExample';

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
  const [surface, setSurface] = React.useState<'core' | 'editor'>('core');

  return (
    <SafeAreaView style={styles.app}>
      <View accessibilityRole="tablist" style={styles.surfaceTabs}>
        {(['core', 'editor'] as const).map((value) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: surface === value }}
            key={value}
            onPress={() => setSurface(value)}
            testID={`surface-${value}`}
            style={[
              styles.surfaceTab,
              surface === value && styles.surfaceTabSelected,
            ]}
          >
            <Text
              style={[
                styles.surfaceTabText,
                surface === value && styles.surfaceTabTextSelected,
              ]}
            >
              {value === 'core' ? 'Core lab' : 'Editor 0.1.0'}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.surface}>
        {surface === 'core' ? (
          <ImageMarkerLab
            assets={{ icon, icon1, bg, base64Bg, orientationBg }}
            backgroundFormats={['normal image', 'base64', 'rotated image']}
            featureVariant="orientation"
            getFileSize={getFileSize}
            pickImage={pickImage}
            readFileBase64={readFileBase64}
            removeFile={removeFile}
          />
        ) : (
          <EditorExample />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  surface: {
    flex: 1,
  },
  surfaceTabs: {
    alignSelf: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 9,
    flexDirection: 'row',
    margin: 8,
    padding: 3,
  },
  surfaceTab: {
    borderRadius: 7,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  surfaceTabSelected: {
    backgroundColor: '#FFFFFF',
  },
  surfaceTabText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  surfaceTabTextSelected: {
    color: '#3156D9',
  },
});

export default App;
