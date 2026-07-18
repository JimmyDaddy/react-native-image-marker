import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Marker, {
  ImageFormat,
  Position,
  TextBackgroundType,
} from 'react-native-image-marker';
import { installWebSmokeHarness } from './smoke-harness.web';

const backgroundUri = Asset.fromModule(require('./assets/bg.png')).uri;
const logoUri = Asset.fromModule(require('./assets/icon.jpeg')).uri;
type LayoutMode = 'single' | 'textTile' | 'logoTile' | 'blend';

installWebSmokeHarness({ backgroundUri, logoUri });

const positions = [
  { label: 'Left', value: Position.bottomLeft },
  { label: 'Center', value: Position.bottomCenter },
  { label: 'Right', value: Position.bottomRight },
] as const;

function downloadDataUrl(dataUrl: string, extension: 'jpg' | 'png') {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = `image-marker-web-demo.${extension}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function App() {
  const [text, setText] = useState('SHOT ON IMAGE MARKER');
  const [fontSize, setFontSize] = useState(54);
  const [position, setPosition] = useState<Position>(Position.bottomLeft);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('single');
  const [format, setFormat] = useState<ImageFormat>(ImageFormat.jpg);
  const [result, setResult] = useState<{
    dataUrl: string;
    extension: 'jpg' | 'png';
  } | null>(null);
  const [status, setStatus] = useState(
    'Choose your settings, then render the same Marker.mark() API in the browser.'
  );
  const [isRendering, setIsRendering] = useState(false);
  const renderRequest = useRef(0);

  const extension = format === ImageFormat.png ? 'png' : 'jpg';
  const displayedExtension = result?.extension ?? extension;
  const outputSummary = useMemo(() => {
    if (!result) {
      return 'No generated output yet';
    }
    return `${result.dataUrl.slice(0, 30)}… · ${Math.round(
      result.dataUrl.length / 1024
    )} KiB`;
  }, [result]);

  const renderWatermark = useCallback(async () => {
    const request = ++renderRequest.current;
    const requestedExtension = extension;
    setIsRendering(true);
    setStatus(
      layoutMode === 'blend'
        ? 'Compositing screen text and a multiply logo with Canvas 2D…'
        : 'Rendering text and image layers with Canvas 2D…'
    );

    try {
      const dataUrl = await Marker.mark({
        backgroundImage: {
          src: { uri: backgroundUri },
        },
        watermarks: [
          {
            type: 'text',
            text: text.trim() || 'SHOT ON IMAGE MARKER',
            blendMode: layoutMode === 'blend' ? 'screen' : 'normal',
            ...(layoutMode === 'textTile'
              ? {
                  layout: {
                    type: 'tile' as const,
                    gapX: '8%',
                    gapY: '7%',
                    offsetX: '-2%',
                    stagger: true,
                  },
                }
              : {
                  position: {
                    position:
                      layoutMode === 'blend' ? Position.bottomCenter : position,
                    X:
                      layoutMode === 'blend' ||
                      position === Position.bottomCenter
                        ? 0
                        : 48,
                    Y: 48,
                  },
                }),
            style: {
              color:
                layoutMode === 'textTile'
                  ? '#FFFFFF88'
                  : layoutMode === 'blend'
                  ? '#FFE9B8'
                  : '#FFFFFF',
              strokeStyle: {
                color: '#101828CC',
                width: 3,
              },
              fontSize:
                layoutMode === 'textTile' ? Math.min(fontSize, 42) : fontSize,
              bold: true,
              rotate: layoutMode === 'textTile' ? -24 : 0,
              shadowStyle: {
                color: '#11182799',
                dx: 0,
                dy: 4,
                radius: 10,
              },
              textBackgroundStyle: {
                type: TextBackgroundType.none,
                color: '#101828CC',
                paddingX: 22,
                paddingY: 12,
              },
            },
          },
          {
            type: 'image',
            src: { uri: logoUri },
            blendMode: layoutMode === 'blend' ? 'multiply' : 'normal',
            ...(layoutMode === 'logoTile'
              ? {
                  layout: {
                    type: 'tile' as const,
                    gapX: '8%',
                    gapY: '8%',
                    stagger: true,
                  },
                }
              : {
                  position: {
                    position:
                      layoutMode === 'blend'
                        ? Position.center
                        : Position.topRight,
                    X: layoutMode === 'blend' ? 0 : 48,
                    Y: layoutMode === 'blend' ? 0 : 48,
                  },
                }),
            scale:
              layoutMode === 'logoTile'
                ? 0.08
                : layoutMode === 'blend'
                ? 0.72
                : 0.16,
            alpha:
              layoutMode === 'logoTile'
                ? 0.5
                : layoutMode === 'blend'
                ? 0.84
                : 0.92,
            rotate:
              layoutMode === 'logoTile'
                ? -12
                : layoutMode === 'blend'
                ? -8
                : -6,
            trimTransparentPadding: true,
          },
        ],
        filename: 'image-marker-web-demo',
        quality: 92,
        saveFormat: format,
      });

      if (request !== renderRequest.current) {
        return;
      }
      setResult({ dataUrl, extension: requestedExtension });
      setStatus(
        `Rendered ${requestedExtension.toUpperCase()} data URL entirely in this browser.`
      );
    } catch (error) {
      if (request !== renderRequest.current) {
        return;
      }
      setStatus(
        error instanceof Error ? error.message : 'Could not render the image.'
      );
    } finally {
      if (request === renderRequest.current) {
        setIsRendering(false);
      }
    }
  }, [extension, fontSize, format, layoutMode, position, text]);

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrow}>REACT NATIVE WEB EXAMPLE</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Canvas 2D</Text>
            </View>
          </View>
          <Text style={styles.title}>Make the watermark. Keep the moment.</Text>
          <Text style={styles.subtitle}>
            This web entry uses React Native components and the package's public
            Marker API. Rendering stays local and returns a downloadable data
            URL.
          </Text>
        </View>

        <View style={styles.workspace}>
          <View style={styles.previewPanel}>
            <View style={styles.panelHeading}>
              <View>
                <Text style={styles.kicker}>OUTPUT PREVIEW</Text>
                <Text style={styles.panelTitle}>1920 × 1080 composition</Text>
              </View>
              <Text style={styles.outputMeta}>
                {displayedExtension.toUpperCase()} · 92%
              </Text>
            </View>

            <View style={styles.imageFrame}>
              <Image
                accessibilityLabel={
                  result
                    ? 'Generated image with text and logo watermarks'
                    : 'Example mountain landscape before watermarking'
                }
                resizeMode="cover"
                source={{ uri: result?.dataUrl ?? backgroundUri }}
                style={styles.previewImage}
              />
              {!result ? (
                <View pointerEvents="none" style={styles.previewHint}>
                  <Text style={styles.previewHintText}>READY TO MARK</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.outputRow}>
              <View style={styles.outputDetails}>
                <Text style={styles.outputLabel}>BROWSER OUTPUT</Text>
                <Text numberOfLines={1} style={styles.outputValue}>
                  {outputSummary}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={!result}
                onPress={() =>
                  result && downloadDataUrl(result.dataUrl, result.extension)
                }
                style={({ pressed }) => [
                  styles.secondaryButton,
                  !result && styles.disabledButton,
                  pressed && Boolean(result) && styles.pressedButton,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Download</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.controlsPanel}>
            <Text style={styles.kicker}>LIVE CONTROLS</Text>
            <Text style={styles.panelTitle}>Compose two ordered layers</Text>

            <Text style={styles.label}>Watermark text</Text>
            <TextInput
              accessibilityLabel="Watermark text"
              autoCapitalize="characters"
              maxLength={42}
              onChangeText={setText}
              placeholder="Enter a watermark"
              placeholderTextColor="#697386"
              selectionColor="#6477F3"
              style={styles.input}
              value={text}
            />

            <View style={styles.labelRow}>
              <Text style={styles.label}>Text size</Text>
              <Text style={styles.valueLabel}>{fontSize}px</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                accessibilityLabel="Decrease text size"
                accessibilityRole="button"
                onPress={() => setFontSize((value) => Math.max(30, value - 6))}
                style={({ pressed }) => [
                  styles.stepButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <Text style={styles.stepButtonText}>−</Text>
              </Pressable>
              <View style={styles.stepTrack}>
                <View
                  style={[
                    styles.stepProgress,
                    { width: `${((fontSize - 30) / 60) * 100}%` },
                  ]}
                />
              </View>
              <Pressable
                accessibilityLabel="Increase text size"
                accessibilityRole="button"
                onPress={() => setFontSize((value) => Math.min(90, value + 6))}
                style={({ pressed }) => [
                  styles.stepButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <Text style={styles.stepButtonText}>+</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Watermark layout</Text>
            <View style={styles.segmentedControl}>
              {(
                [
                  { label: 'Single', value: 'single' },
                  { label: 'Text tile', value: 'textTile' },
                  { label: 'Logo tile', value: 'logoTile' },
                  { label: 'Blend', value: 'blend' },
                ] as const
              ).map((item) => {
                const selected = layoutMode === item.value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={item.value}
                    onPress={() => {
                      setLayoutMode(item.value);
                      setResult(null);
                    }}
                    style={({ pressed }) => [
                      styles.segment,
                      selected && styles.selectedSegment,
                      pressed && styles.pressedButton,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        selected && styles.selectedSegmentText,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Text anchor</Text>
            <View style={styles.segmentedControl}>
              {positions.map((item) => {
                const selected = position === item.value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={item.value}
                    onPress={() => setPosition(item.value)}
                    style={({ pressed }) => [
                      styles.segment,
                      selected && styles.selectedSegment,
                      pressed && styles.pressedButton,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        selected && styles.selectedSegmentText,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Output format</Text>
            <View style={styles.segmentedControl}>
              {[ImageFormat.jpg, ImageFormat.png].map((item) => {
                const selected = format === item;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={item}
                    onPress={() => setFormat(item)}
                    style={({ pressed }) => [
                      styles.segment,
                      selected && styles.selectedSegment,
                      pressed && styles.pressedButton,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        selected && styles.selectedSegmentText,
                      ]}
                    >
                      {item.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.layerNote}>
              <View style={styles.layerDot} />
              <Text style={styles.layerNoteText}>
                {layoutMode === 'textTile'
                  ? 'Layer 1 · staggered outlined text\nLayer 2 · image logo at top right'
                  : layoutMode === 'logoTile'
                  ? 'Layer 1 · text badge\nLayer 2 · repeated image logo grid'
                  : layoutMode === 'blend'
                  ? 'Layer 1 · screen text\nLayer 2 · multiply logo at center'
                  : 'Layer 1 · text badge\nLayer 2 · image logo at top right'}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isRendering}
              onPress={renderWatermark}
              style={({ pressed }) => [
                styles.primaryButton,
                isRendering && styles.disabledButton,
                pressed && !isRendering && styles.pressedButton,
              ]}
            >
              {isRendering ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Render with Marker.mark()
                </Text>
              )}
            </Pressable>
            <Text accessibilityLiveRegion="polite" style={styles.statusText}>
              {status}
            </Text>
          </View>
        </View>

        <Text style={styles.footnote}>
          Web output is produced with the package's Canvas renderer. Native iOS
          and Android builds continue to use their platform renderers.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0C1018',
  },
  content: {
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  hero: {
    maxWidth: 820,
    marginBottom: 36,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  eyebrow: {
    color: '#91A0BA',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  badge: {
    borderWidth: 1,
    borderColor: '#394B8A',
    borderRadius: 999,
    backgroundColor: '#18234D',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#BFC8FF',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    color: '#F6F8FC',
    fontSize: 48,
    lineHeight: 54,
    fontWeight: '800',
    letterSpacing: -1.6,
  },
  subtitle: {
    color: '#AAB4C8',
    fontSize: 17,
    lineHeight: 27,
    marginTop: 18,
    maxWidth: 720,
  },
  workspace: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flexWrap: 'wrap',
    gap: 20,
  },
  previewPanel: {
    flexGrow: 1,
    flexBasis: 660,
    minWidth: 300,
    borderWidth: 1,
    borderColor: '#273043',
    borderRadius: 22,
    backgroundColor: '#121722',
    padding: 18,
  },
  controlsPanel: {
    flexGrow: 1,
    flexBasis: 360,
    minWidth: 300,
    borderWidth: 1,
    borderColor: '#273043',
    borderRadius: 22,
    backgroundColor: '#121722',
    padding: 22,
  },
  panelHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 4,
    paddingBottom: 16,
  },
  kicker: {
    color: '#8390A7',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 7,
  },
  panelTitle: {
    color: '#F1F4F9',
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '700',
  },
  outputMeta: {
    color: '#91A0BA',
    fontSize: 12,
    fontWeight: '600',
  },
  imageFrame: {
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#090C12',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  previewHint: {
    position: 'absolute',
    left: 18,
    bottom: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF55',
    borderRadius: 999,
    backgroundColor: '#0C1018BB',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  previewHintText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
  },
  outputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    paddingTop: 16,
    paddingHorizontal: 4,
  },
  outputDetails: {
    flex: 1,
    minWidth: 0,
  },
  outputLabel: {
    color: '#8390A7',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  outputValue: {
    color: '#D4DAE5',
    fontSize: 12,
    marginTop: 5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: '#C9D0DD',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 9,
  },
  valueLabel: {
    color: '#8E9BFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 9,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#344057',
    borderRadius: 11,
    backgroundColor: '#0C111B',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#344057',
    borderRadius: 10,
    backgroundColor: '#181E2A',
  },
  stepButtonText: {
    color: '#E8ECF4',
    fontSize: 20,
    fontWeight: '600',
  },
  stepTrack: {
    flex: 1,
    height: 5,
    overflow: 'hidden',
    borderRadius: 99,
    backgroundColor: '#2A3242',
  },
  stepProgress: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#6477F3',
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 7,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#344057',
    borderRadius: 10,
    backgroundColor: '#181E2A',
    paddingHorizontal: 9,
  },
  selectedSegment: {
    borderColor: '#7182FF',
    backgroundColor: '#273466',
  },
  segmentText: {
    color: '#AAB4C8',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedSegmentText: {
    color: '#FFFFFF',
  },
  layerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: '#283248',
    borderRadius: 11,
    backgroundColor: '#0F1420',
    marginTop: 22,
    padding: 13,
  },
  layerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F27C6B',
    marginTop: 5,
  },
  layerNoteText: {
    flex: 1,
    color: '#9EA9BC',
    fontSize: 12,
    lineHeight: 19,
  },
  primaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#566BEA',
    marginTop: 22,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#42506A',
    borderRadius: 10,
    backgroundColor: '#1A2130',
    paddingHorizontal: 15,
  },
  secondaryButtonText: {
    color: '#E7EBF2',
    fontSize: 12,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.42,
  },
  pressedButton: {
    opacity: 0.72,
  },
  statusText: {
    minHeight: 38,
    color: '#8996AA',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 10,
  },
  footnote: {
    color: '#758196',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 22,
  },
});

export default App;
