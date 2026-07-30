import * as React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ImageMarkerEditorController } from './controller';
import {
  useImageMarkerEditorState,
  type ImageMarkerEditorPlugin,
} from './EditorSurface';
import type {
  EditorAsset,
  EditorBrandKit,
  EditorState,
  WatermarkBlendMode,
  WatermarkRecipeDefinitionLayer,
} from './types';

function parseNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function Action({
  disabled,
  label,
  onPress,
  testID,
}: {
  disabled?: boolean;
  label: string;
  onPress(): void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        pressed && styles.actionPressed,
        disabled && styles.disabled,
      ]}
      testID={testID}
    >
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  testID,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText(value: string): void;
  testID: string;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        style={styles.input}
        testID={testID}
        value={value}
      />
    </View>
  );
}

export interface ImageMarkerEditorInspectorProps {
  controller: ImageMarkerEditorController;
  state?: EditorState;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  brandKit?: EditorBrandKit;
  plugins?: readonly ImageMarkerEditorPlugin[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  empty?: React.ReactNode;
}

/**
 * Inspector for text content, typography, color, opacity, stroke, blend mode,
 * and image replacement hooks supplied by an Asset Panel.
 */
export function ImageMarkerEditorInspector({
  controller,
  state: controlledState,
  style,
  testID = 'image-marker-editor-inspector',
  brandKit,
  plugins = [],
  header,
  footer,
  empty,
}: ImageMarkerEditorInspectorProps) {
  const state = useImageMarkerEditorState(
    controller,
    undefined,
    controlledState
  );
  const selected = state.recipe.layers.find(
    (layer) => layer.id === state.selectedLayerId
  );
  if (!selected) {
    return (
      <View style={[styles.panel, style]} testID={testID}>
        {header}
        {empty ?? (
          <Text style={styles.empty}>
            Select a layer to edit its properties.
          </Text>
        )}
        {footer}
      </View>
    );
  }
  const opacity = selected.alpha ?? 1;
  const blendModes: readonly WatermarkBlendMode[] = [
    'normal',
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
  ];
  return (
    <ScrollView
      contentContainerStyle={[styles.panel, style]}
      keyboardShouldPersistTaps="handled"
      testID={testID}
    >
      {header}
      <Text style={styles.heading}>Inspector</Text>
      <Field
        label="Layer name"
        onChangeText={(value) => controller.renameLayer(selected.id, value)}
        testID={`${testID}-name`}
        value={selected.name ?? ''}
      />
      <Field
        keyboardType="numeric"
        label="Opacity"
        onChangeText={(value) =>
          controller.patchLayer(selected.id, {
            alpha: Math.max(0, Math.min(parseNumber(value, opacity), 1)),
          })
        }
        testID={`${testID}-opacity`}
        value={String(opacity)}
      />
      <Text style={styles.fieldLabel}>Blend mode</Text>
      <View style={styles.row}>
        {blendModes.map((mode) => (
          <Action
            key={mode}
            label={mode}
            onPress={() =>
              controller.patchLayer(selected.id, { blendMode: mode })
            }
            testID={`${testID}-blend-${mode}`}
          />
        ))}
      </View>
      {selected.type === 'text' && (
        <>
          <Field
            label="Text"
            onChangeText={(text) =>
              controller.updateTextLayer(selected.id, { text })
            }
            testID={`${testID}-text`}
            value={selected.text}
          />
          <Field
            label="Font"
            onChangeText={(fontName) =>
              controller.updateTextLayer(selected.id, {
                style: { fontName: fontName || undefined },
              })
            }
            testID={`${testID}-font`}
            value={selected.style?.fontName ?? ''}
          />
          <Field
            keyboardType="numeric"
            label="Font size"
            onChangeText={(value) =>
              controller.updateTextLayer(selected.id, {
                style: {
                  fontSize: Math.max(
                    1,
                    parseNumber(value, selected.style?.fontSize ?? 14)
                  ),
                  fontSizeRatio: undefined,
                },
              })
            }
            testID={`${testID}-font-size`}
            value={String(selected.style?.fontSize ?? 14)}
          />
          <Field
            label="Color"
            onChangeText={(color) =>
              controller.updateTextLayer(selected.id, { style: { color } })
            }
            testID={`${testID}-color`}
            value={selected.style?.color ?? '#FFFFFF'}
          />
          <Field
            keyboardType="numeric"
            label="Stroke width"
            onChangeText={(value) =>
              controller.updateTextLayer(selected.id, {
                style: {
                  strokeStyle: {
                    color: selected.style?.strokeStyle?.color ?? '#000000',
                    width: Math.max(
                      0,
                      parseNumber(
                        value,
                        selected.style?.strokeStyle?.width ?? 0
                      )
                    ),
                  },
                },
              })
            }
            testID={`${testID}-stroke-width`}
            value={String(selected.style?.strokeStyle?.width ?? 0)}
          />
          <Field
            label="Stroke color"
            onChangeText={(color) =>
              controller.updateTextLayer(selected.id, {
                style: {
                  strokeStyle: {
                    color,
                    width: selected.style?.strokeStyle?.width ?? 1,
                  },
                },
              })
            }
            testID={`${testID}-stroke-color`}
            value={selected.style?.strokeStyle?.color ?? '#000000'}
          />
          <View style={styles.row}>
            <Action
              label={selected.style?.bold ? 'Unbold' : 'Bold'}
              onPress={() =>
                controller.updateTextLayer(selected.id, {
                  style: { bold: !selected.style?.bold },
                })
              }
              testID={`${testID}-bold`}
            />
            <Action
              label={selected.style?.italic ? 'Unitalic' : 'Italic'}
              onPress={() =>
                controller.updateTextLayer(selected.id, {
                  style: { italic: !selected.style?.italic },
                })
              }
              testID={`${testID}-italic`}
            />
          </View>
          {brandKit?.colors && (
            <>
              <Text style={styles.fieldLabel}>Brand colors</Text>
              <View style={styles.row}>
                {brandKit.colors.map((color) => (
                  <Pressable
                    accessibilityLabel={`Use brand color ${color}`}
                    accessibilityRole="button"
                    key={color}
                    onPress={() =>
                      controller.updateTextLayer(selected.id, {
                        style: { color },
                      })
                    }
                    style={[styles.swatch, { backgroundColor: color }]}
                    testID={`${testID}-brand-color-${color}`}
                  />
                ))}
              </View>
            </>
          )}
          {brandKit?.fonts && (
            <>
              <Text style={styles.fieldLabel}>Brand fonts</Text>
              <View style={styles.row}>
                {brandKit.fonts.map((font) => (
                  <Action
                    key={font}
                    label={font}
                    onPress={() =>
                      controller.updateTextLayer(selected.id, {
                        style: { fontName: font },
                      })
                    }
                    testID={`${testID}-brand-font-${font}`}
                  />
                ))}
              </View>
            </>
          )}
        </>
      )}
      {plugins.map((plugin) => (
        <React.Fragment key={plugin.id}>
          {plugin.renderInspectorSection?.({ controller, state })}
        </React.Fragment>
      ))}
      {footer}
    </ScrollView>
  );
}

export interface ImageMarkerEditorLayerPanelProps {
  controller: ImageMarkerEditorController;
  state?: EditorState;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  renderLayerLabel?: (
    layer: WatermarkRecipeDefinitionLayer,
    selected: boolean
  ) => React.ReactNode;
}

/** Layer list with selection, rename, lock, visibility, delete, and ordering. */
export function ImageMarkerEditorLayerPanel({
  controller,
  state: controlledState,
  style,
  testID = 'image-marker-editor-layers',
  header,
  footer,
  renderLayerLabel,
}: ImageMarkerEditorLayerPanelProps) {
  const state = useImageMarkerEditorState(
    controller,
    undefined,
    controlledState
  );
  return (
    <View style={[styles.panel, style]} testID={testID}>
      {header}
      <Text style={styles.heading}>Layers</Text>
      {[...state.recipe.layers].reverse().map((layer) => {
        const index = state.recipe.layers.findIndex(
          (item) => item.id === layer.id
        );
        const selected = state.selectedLayerIds.includes(layer.id);
        return (
          <View
            key={layer.id}
            style={[styles.layerRow, selected && styles.selectedRow]}
            testID={`${testID}-${layer.id}`}
          >
            <Pressable
              accessibilityRole="button"
              onLongPress={() => controller.selectLayer(layer.id, 'toggle')}
              onPress={() => controller.selectLayer(layer.id)}
              style={styles.layerSelect}
              testID={`${testID}-${layer.id}-select`}
            >
              {renderLayerLabel?.(layer, selected) ?? (
                <Text style={styles.layerLabel}>
                  {layer.type === 'text' ? 'T' : '▧'} {layer.name ?? layer.id}
                </Text>
              )}
            </Pressable>
            <Action
              disabled={layer.locked}
              label={layer.visible === false ? 'Show' : 'Hide'}
              onPress={() =>
                controller.setLayerVisible(layer.id, layer.visible === false)
              }
              testID={`${testID}-${layer.id}-visibility`}
            />
            <Action
              label={layer.locked ? 'Unlock' : 'Lock'}
              onPress={() => controller.setLayerLocked(layer.id, !layer.locked)}
              testID={`${testID}-${layer.id}-lock`}
            />
            <Action
              disabled={layer.locked || index >= state.recipe.layers.length - 1}
              label="↑"
              onPress={() => controller.reorderLayer(layer.id, index + 1)}
              testID={`${testID}-${layer.id}-raise`}
            />
            <Action
              disabled={layer.locked || index <= 0}
              label="↓"
              onPress={() => controller.reorderLayer(layer.id, index - 1)}
              testID={`${testID}-${layer.id}-lower`}
            />
            <Action
              disabled={layer.locked}
              label="×"
              onPress={() => controller.removeLayer(layer.id)}
              testID={`${testID}-${layer.id}-delete`}
            />
          </View>
        );
      })}
      {footer}
    </View>
  );
}

export interface ImageMarkerEditorAssetPanelProps<Source = unknown> {
  controller: ImageMarkerEditorController;
  assets: readonly EditorAsset<Source>[];
  state?: EditorState;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  onRequestAsset?: () => void;
  renderAsset?: (asset: EditorAsset<Source>) => React.ReactNode;
}

/** Asset and Logo panel that adds images or replaces the selected image. */
export function ImageMarkerEditorAssetPanel<Source = unknown>({
  controller,
  assets,
  state: controlledState,
  style,
  testID = 'image-marker-editor-assets',
  header,
  footer,
  onRequestAsset,
  renderAsset,
}: ImageMarkerEditorAssetPanelProps<Source>) {
  const state = useImageMarkerEditorState(
    controller,
    undefined,
    controlledState
  );
  const selected = state.recipe.layers.find(
    (layer) => layer.id === state.selectedLayerId
  );
  const applyAsset = (asset: EditorAsset<Source>) => {
    if (selected?.type === 'image' && !selected.locked) {
      controller.replaceImage(selected.id, asset.source);
      controller.renameLayer(selected.id, asset.name);
      return;
    }
    controller.addLayer({
      type: 'image',
      name: asset.name,
      src: asset.source,
      position: { X: 32, Y: 32 },
    });
  };
  return (
    <View style={[styles.panel, style]} testID={testID}>
      {header}
      <View style={styles.panelHeadingRow}>
        <Text style={styles.heading}>Assets</Text>
        {onRequestAsset && (
          <Action
            label="Choose image"
            onPress={onRequestAsset}
            testID={`${testID}-choose`}
          />
        )}
      </View>
      <View style={styles.row}>
        {assets.map((asset) => (
          <Pressable
            accessibilityLabel={`Use ${asset.name}`}
            accessibilityRole="button"
            key={asset.id}
            onPress={() => applyAsset(asset)}
            style={({ pressed }) => [
              styles.asset,
              pressed && styles.actionPressed,
            ]}
            testID={`${testID}-${asset.id}`}
          >
            {renderAsset?.(asset) ?? (
              <Text style={styles.assetLabel}>{asset.name}</Text>
            )}
          </Pressable>
        ))}
      </View>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#111827',
    borderColor: '#334155',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  heading: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  panelHeadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  empty: {
    color: '#94A3B8',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  field: {
    marginBottom: 10,
  },
  fieldLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#0F172A',
    borderColor: '#475569',
    borderRadius: 6,
    borderWidth: 1,
    color: '#F8FAFC',
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  action: {
    backgroundColor: '#1E293B',
    borderRadius: 5,
    marginBottom: 5,
    marginRight: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actionPressed: {
    opacity: 0.72,
  },
  actionLabel: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.35,
  },
  swatch: {
    borderColor: '#F8FAFC',
    borderRadius: 15,
    borderWidth: 1,
    height: 30,
    marginBottom: 8,
    marginRight: 8,
    width: 30,
  },
  layerRow: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 5,
    padding: 4,
  },
  selectedRow: {
    backgroundColor: '#172554',
    borderColor: '#38BDF8',
  },
  layerSelect: {
    flex: 1,
    minWidth: 100,
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  layerLabel: {
    color: '#F8FAFC',
    fontSize: 12,
  },
  asset: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 8,
    marginRight: 8,
    minHeight: 64,
    minWidth: 88,
    padding: 10,
  },
  assetLabel: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
});
