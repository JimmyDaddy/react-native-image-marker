import React, { useCallback, useMemo, useState } from 'react';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Marker, {
  ImageFormat,
  Position,
  TextBackgroundType,
} from 'react-native-image-marker';

const bundledBackground = require('./assets/bg.png');
const logo = require('./assets/icon.jpeg');

function App() {
  const [background, setBackground] = useState<any>(bundledBackground);
  const [result, setResult] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [message, setMessage] = useState(
    'Uses the native module through an Expo development build.'
  );

  const previewSource = useMemo(
    () => (result ? { uri: result } : background),
    [background, result]
  );

  const chooseBackground = useCallback(async () => {
    const selection = await launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      selectionLimit: 1,
    });
    const selected = selection.assets?.[0]?.uri;
    if (!selection.canceled && selected) {
      setBackground({ uri: selected });
      setResult(null);
      setMessage('Local image selected. It stays on this device.');
    }
  }, []);

  const renderWatermark = useCallback(async () => {
    setIsRendering(true);
    setMessage('Rendering text and image layers with the native module…');
    try {
      const output = await Marker.mark({
        backgroundImage: { src: background },
        watermarks: [
          {
            type: 'text',
            text: 'SHOT ON IMAGE MARKER',
            position: { position: Position.bottomLeft, X: 36, Y: 36 },
            style: {
              color: '#FFFFFF',
              fontSize: 34,
              bold: true,
              shadowStyle: {
                color: '#00000099',
                dx: 0,
                dy: 3,
                radius: 8,
              },
              textBackgroundStyle: {
                type: TextBackgroundType.none,
                color: '#101828CC',
                paddingX: 18,
                paddingY: 10,
              },
            },
          },
          {
            type: 'image',
            src: logo,
            position: { position: Position.topRight, X: 36, Y: 36 },
            scale: 0.16,
            alpha: 0.9,
            rotate: -6,
          },
        ],
        filename: `image-marker-${Date.now()}`,
        quality: 92,
        saveFormat: ImageFormat.jpg,
      });
      setResult(output);
      setMessage('Rendered locally. The preview is the generated JPEG.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Rendering failed.');
    } finally {
      setIsRendering(false);
    }
  }, [background]);

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>EXPO SDK 57 · NEW ARCHITECTURE</Text>
          <Text style={styles.title}>Native watermark example</Text>
          <Text style={styles.subtitle}>
            Pick a photo or use the bundled one, then render ordered text and
            image layers with Marker.mark().
          </Text>
        </View>

        <View style={styles.card}>
          <Image
            resizeMode="cover"
            source={previewSource}
            style={styles.image}
          />
          <View style={styles.actions}>
            <Pressable
              onPress={chooseBackground}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Choose photo</Text>
            </Pressable>
            <Pressable
              disabled={isRendering}
              onPress={renderWatermark}
              style={[
                styles.primaryButton,
                isRendering && styles.disabledButton,
              ]}
            >
              {isRendering ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Add watermark</Text>
              )}
            </Pressable>
          </View>
          <Text accessibilityLiveRegion="polite" style={styles.message}>
            {message}
          </Text>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>Why a development build?</Text>
          <Text style={styles.noteText}>
            The iOS and Android renderers are native modules. Build this example
            with expo run:*, EAS Build, or a custom development client.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0C1018' },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginVertical: 24 },
  eyebrow: {
    color: '#8E9BFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    color: '#F7F8FC',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 12,
  },
  subtitle: { color: '#AAB4C8', fontSize: 16, lineHeight: 24, marginTop: 12 },
  card: {
    borderWidth: 1,
    borderColor: '#293247',
    borderRadius: 20,
    backgroundColor: '#121722',
    overflow: 'hidden',
  },
  image: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#080B11' },
  actions: { flexDirection: 'row', gap: 12, padding: 16 },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#6574F7',
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3A465E',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: '#D9DEEA', fontSize: 15, fontWeight: '700' },
  disabledButton: { opacity: 0.55 },
  message: {
    color: '#9DA8BB',
    fontSize: 13,
    lineHeight: 20,
    padding: 16,
    paddingTop: 0,
  },
  note: {
    borderWidth: 1,
    borderColor: '#273043',
    borderRadius: 16,
    backgroundColor: '#111621',
    marginTop: 16,
    padding: 18,
  },
  noteTitle: { color: '#F0F3F8', fontSize: 15, fontWeight: '700' },
  noteText: { color: '#98A4B8', fontSize: 14, lineHeight: 22, marginTop: 8 },
});

export default App;
