import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  ImageMarkerEditor,
  ImageMarkerEditorController,
  ImageMarkerEditorToolbar,
  type EditorState,
} from 'react-native-image-marker-editor';
import { createCoreEditorAdapter } from 'react-native-image-marker-editor/core-adapter';
import { ImageFormat } from 'react-native-image-marker';

const background = require('./bg.png');
const logo = require('./icon.jpeg');
const adapter = createCoreEditorAdapter(960);

function actionStyle(pressed: boolean) {
  return [styles.action, pressed && styles.actionPressed];
}

export default function EditorExample() {
  const { width } = useWindowDimensions();
  const canvasWidth = Math.min(Math.max(width - 32, 280), 720);
  const canvasHeight = Math.round(canvasWidth * 0.62);
  const controller = React.useMemo(
    () =>
      new ImageMarkerEditorController({
        schemaVersion: 2,
        layers: [
          {
            id: 'editor-title',
            name: 'Campaign title',
            type: 'text',
            text: 'IMAGE MARKER 2.0',
            position: { X: 32, Y: 40 },
            style: {
              color: '#FFFFFF',
              fontSize: 24,
              bold: true,
              shadowStyle: {
                color: '#0F172A',
                dx: 1,
                dy: 2,
                radius: 3,
              },
            },
          },
          {
            id: 'editor-logo',
            name: 'Brand mark',
            type: 'image',
            src: logo,
            position: { X: 190, Y: 130 },
            scale: 0.65,
          },
        ],
        output: {
          saveFormat: ImageFormat.png,
        },
      }),
    []
  );
  const [state, setState] = React.useState<EditorState>(() =>
    controller.getState()
  );
  const [resultUri, setResultUri] = React.useState<string>();
  const [status, setStatus] = React.useState('Drag a layer to start editing.');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => controller.subscribe(setState), [controller]);

  const render = React.useCallback(
    async (final: boolean) => {
      setBusy(true);
      setStatus(
        final ? 'Exporting original resolution…' : 'Rendering preview…'
      );
      try {
        const request = {
          recipe: controller.exportRecipe(),
          input: { backgroundImage: { src: background } },
          control: {
            timeoutMs: 20_000,
            onProgress: ({
              phase,
              progress,
            }: {
              phase: string;
              progress: number;
            }) => setStatus(`${phase} ${Math.round(progress * 100)}%`),
          },
        };
        const result = final
          ? (await adapter.exportOriginal(request)).final
          : await adapter.renderPreview(request);
        setResultUri(result.uri);
        setStatus(
          `${
            final ? 'Export' : 'Preview'
          } ready · ${result.format.toUpperCase()} · ${result.durationMs} ms`
        );
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(false);
      }
    },
    [controller]
  );

  const addText = React.useCallback(() => {
    controller.addLayer({
      type: 'text',
      text: 'New text',
      position: { X: 80, Y: 90 },
      style: { color: '#F8FAFC', fontSize: 20, bold: true },
    });
  }, [controller]);

  const addLogo = React.useCallback(() => {
    controller.addLayer({
      type: 'image',
      src: logo,
      position: { X: 120, Y: 120 },
      scale: 0.5,
    });
  }, [controller]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heading}>
        <View>
          <Text style={styles.eyebrow}>OPTIONAL PACKAGE · 0.0.2</Text>
          <Text style={styles.title}>Interactive Recipe v2 editor</Text>
        </View>
        <Text style={styles.subtitle}>
          Select, drag, pinch, rotate, lock, reorder, undo, and export through
          Core 2.0.
        </Text>
      </View>

      <View style={styles.quickActions}>
        <Pressable
          accessibilityRole="button"
          onPress={addText}
          style={({ pressed }) => actionStyle(pressed)}
        >
          <Text style={styles.actionText}>Add text</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={addLogo}
          style={({ pressed }) => actionStyle(pressed)}
        >
          <Text style={styles.actionText}>Add image</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => render(false)}
          style={({ pressed }) => actionStyle(pressed)}
        >
          <Text style={styles.actionText}>Preview</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => render(true)}
          style={({ pressed }) => actionStyle(pressed)}
        >
          <Text style={styles.actionText}>Export original</Text>
        </Pressable>
      </View>

      <ImageMarkerEditorToolbar controller={controller} />
      <View style={styles.canvasFrame}>
        <ImageMarkerEditor
          background={
            <Image
              resizeMode="cover"
              source={background}
              style={StyleSheet.absoluteFill}
            />
          }
          controller={controller}
          height={canvasHeight}
          onStateChange={setState}
          snapThreshold={8}
          style={styles.canvas}
          width={canvasWidth}
        />
      </View>

      <View style={styles.statusRow}>
        {busy && <ActivityIndicator color="#5271FF" />}
        <Text accessibilityLiveRegion="polite" style={styles.status}>
          {status}
        </Text>
      </View>

      {resultUri && (
        <View style={styles.resultCard}>
          <Text style={styles.sectionTitle}>Core render result</Text>
          <Image
            accessibilityLabel="Exported editor result"
            resizeMode="contain"
            source={{ uri: resultUri }}
            style={[styles.result, { width: canvasWidth }]}
          />
        </View>
      )}

      <View style={styles.recipeCard}>
        <Text style={styles.sectionTitle}>Live Recipe v2</Text>
        <Text selectable style={styles.recipe}>
          {JSON.stringify(state.recipe, null, 2)}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    paddingBottom: 64,
  },
  heading: {
    width: '100%',
    maxWidth: 720,
    marginBottom: 16,
  },
  eyebrow: {
    color: '#3156D9',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#0F172A',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: 720,
    marginBottom: 8,
  },
  action: {
    backgroundColor: '#3156D9',
    borderRadius: 7,
    marginBottom: 8,
    marginRight: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  actionPressed: {
    opacity: 0.78,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  canvasFrame: {
    borderColor: '#CBD5E1',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  canvas: {
    backgroundColor: '#0F172A',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 40,
    width: '100%',
    maxWidth: 720,
  },
  status: {
    color: '#334155',
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
  },
  resultCard: {
    width: '100%',
    maxWidth: 720,
  },
  result: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    height: 280,
  },
  recipeCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    marginTop: 16,
    maxWidth: 720,
    padding: 14,
    width: '100%',
  },
  sectionTitle: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  recipe: {
    color: '#CBD5E1',
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 16,
  },
});
