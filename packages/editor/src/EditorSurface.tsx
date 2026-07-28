import * as React from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type ImageStyle,
  type ImageSourcePropType,
  type PanResponderGestureState,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { WatermarkRecipeDefinitionLayer } from 'react-native-image-marker';
import { angle, distance } from './geometry';
import { ImageMarkerEditorController } from './controller';
import type {
  EditorKeyCommand,
  EditorPoint,
  EditorSize,
  EditorSnapGuide,
  EditorState,
} from './types';

export interface ImageMarkerEditorProps {
  controller: ImageMarkerEditorController;
  width: number;
  height: number;
  background?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  snapThreshold?: number;
  getLayerSize?: (layer: WatermarkRecipeDefinitionLayer) => EditorSize;
  renderLayer?: (
    layer: WatermarkRecipeDefinitionLayer,
    selected: boolean
  ) => React.ReactNode;
  onStateChange?: (state: EditorState) => void;
}

interface LayerGestureBaseline {
  position: EditorPoint;
  scale: number;
  rotation: number;
  distance?: number;
  angle?: number;
}

function coordinate(
  value: number | string | undefined,
  relativeTo: number
): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const normalized = value.trim();
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return normalized.endsWith('%') ? (relativeTo * parsed) / 100 : parsed;
}

function layerScale(layer: WatermarkRecipeDefinitionLayer): number {
  return layer.type === 'image'
    ? layer.scale ?? 1
    : (layer.style?.fontSize ?? 14) / 14;
}

function layerRotation(layer: WatermarkRecipeDefinitionLayer): number {
  return layer.type === 'image' ? layer.rotate ?? 0 : layer.style?.rotate ?? 0;
}

function touchPoints(event: GestureResponderEvent): EditorPoint[] {
  return event.nativeEvent.touches.map((touch) => ({
    x: touch.pageX,
    y: touch.pageY,
  }));
}

function defaultLayerSize(layer: WatermarkRecipeDefinitionLayer): EditorSize {
  if (layer.type === 'text') {
    const fontSize = layer.style?.fontSize ?? 14;
    return {
      width: Math.max(layer.text.length * fontSize * 0.62, 44),
      height: Math.max(fontSize * 1.4, 32),
    };
  }
  return { width: 120, height: 80 };
}

function defaultTextStyle(
  layer: Extract<WatermarkRecipeDefinitionLayer, { type: 'text' }>
): TextStyle {
  return {
    color: layer.style?.color ?? '#FFFFFF',
    fontSize: layer.style?.fontSize ?? 14,
    fontWeight: layer.style?.bold ? '700' : '400',
    fontStyle: layer.style?.italic ? 'italic' : 'normal',
  };
}

function defaultImageStyle(size: EditorSize): ImageStyle {
  return { width: size.width, height: size.height };
}

function positionedLayerStyle(
  layer: WatermarkRecipeDefinitionLayer,
  start: EditorPoint,
  size: EditorSize
): ViewStyle {
  return {
    left: start.x,
    top: start.y,
    width: size.width,
    height: size.height,
    opacity: layer.locked ? 0.72 : 1,
    transform: [
      { scale: layerScale(layer) },
      { rotate: `${layerRotation(layer)}deg` },
    ],
  };
}

function snapGuideStyle(guide: EditorSnapGuide, canvas: EditorSize): ViewStyle {
  return guide.axis === 'x'
    ? { left: guide.position, top: 0, width: 1, height: canvas.height }
    : { top: guide.position, left: 0, height: 1, width: canvas.width };
}

function DefaultLayer({
  layer,
  size,
}: {
  layer: WatermarkRecipeDefinitionLayer;
  size: EditorSize;
}) {
  if (layer.type === 'text') {
    return (
      <Text
        numberOfLines={3}
        style={[styles.defaultText, defaultTextStyle(layer)]}
      >
        {layer.text}
      </Text>
    );
  }
  return (
    <Image
      resizeMode="contain"
      source={layer.src as ImageSourcePropType}
      style={defaultImageStyle(size)}
    />
  );
}

interface EditorLayerProps {
  canvas: EditorSize;
  controller: ImageMarkerEditorController;
  layer: WatermarkRecipeDefinitionLayer;
  selected: boolean;
  snapThreshold?: number;
  size: EditorSize;
  renderLayer?: ImageMarkerEditorProps['renderLayer'];
}

function EditorLayer({
  canvas,
  controller,
  layer,
  selected,
  snapThreshold,
  size,
  renderLayer,
}: EditorLayerProps) {
  const baseline = React.useRef<LayerGestureBaseline>();
  const start = React.useMemo(
    () => ({
      x: coordinate(layer.position?.X, canvas.width),
      y: coordinate(layer.position?.Y, canvas.height),
    }),
    [canvas.height, canvas.width, layer.position?.X, layer.position?.Y]
  );

  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => !layer.locked,
        onPanResponderGrant(event) {
          controller.selectLayer(layer.id);
          if (layer.locked) {
            baseline.current = undefined;
            return;
          }
          controller.beginHistoryGroup();
          const points = touchPoints(event);
          baseline.current = {
            position: start,
            scale: layerScale(layer),
            rotation: layerRotation(layer),
            distance:
              points.length >= 2 ? distance(points[0]!, points[1]!) : undefined,
            angle:
              points.length >= 2 ? angle(points[0]!, points[1]!) : undefined,
          };
        },
        onPanResponderMove(
          event: GestureResponderEvent,
          gesture: PanResponderGestureState
        ) {
          const initial = baseline.current;
          if (!initial) return;
          const points = touchPoints(event);
          if (
            points.length >= 2 &&
            initial.distance !== undefined &&
            initial.angle !== undefined
          ) {
            const nextDistance = distance(points[0]!, points[1]!);
            const nextAngle = angle(points[0]!, points[1]!);
            controller.scaleLayer(
              layer.id,
              initial.scale * (nextDistance / Math.max(initial.distance, 1))
            );
            controller.rotateLayer(
              layer.id,
              initial.rotation + nextAngle - initial.angle
            );
            return;
          }
          controller.moveLayer(
            layer.id,
            {
              x: initial.position.x + gesture.dx,
              y: initial.position.y + gesture.dy,
            },
            {
              canvas,
              layer: size,
              threshold: snapThreshold,
            }
          );
        },
        onPanResponderRelease() {
          if (!baseline.current) return;
          baseline.current = undefined;
          controller.endHistoryGroup();
        },
        onPanResponderTerminate() {
          if (!baseline.current) return;
          baseline.current = undefined;
          controller.endHistoryGroup();
        },
      }),
    [canvas, controller, layer, size, snapThreshold, start]
  );

  if (layer.visible === false) return null;
  return (
    <View
      {...responder.panHandlers}
      accessible
      accessibilityLabel={`${layer.name ?? layer.id}, ${
        layer.type === 'text' ? 'text' : 'image'
      } layer`}
      accessibilityRole="adjustable"
      accessibilityState={{ disabled: layer.locked, selected }}
      accessibilityActions={[
        { name: 'activate', label: 'Select layer' },
        { name: 'increment', label: 'Increase layer size' },
        { name: 'decrement', label: 'Decrease layer size' },
      ]}
      onAccessibilityAction={(event) => {
        if (layer.locked) return;
        if (event.nativeEvent.actionName === 'activate') {
          controller.selectLayer(layer.id);
        } else if (event.nativeEvent.actionName === 'increment') {
          controller.scaleLayer(layer.id, layerScale(layer) + 0.05);
        } else if (event.nativeEvent.actionName === 'decrement') {
          controller.scaleLayer(layer.id, layerScale(layer) - 0.05);
        }
      }}
      style={[
        styles.layer,
        positionedLayerStyle(layer, start, size),
        selected && styles.selectedLayer,
      ]}
    >
      {renderLayer?.(layer, selected) ?? (
        <DefaultLayer layer={layer} size={size} />
      )}
    </View>
  );
}

function Guide({
  guide,
  canvas,
}: {
  guide: EditorSnapGuide;
  canvas: EditorSize;
}) {
  return (
    <View
      pointerEvents="none"
      style={[styles.guide, snapGuideStyle(guide, canvas)]}
    />
  );
}

function useEditorState(
  controller: ImageMarkerEditorController,
  onStateChange?: (state: EditorState) => void
): EditorState {
  const [state, setState] = React.useState(() => controller.getState());
  React.useEffect(
    () =>
      controller.subscribe((next) => {
        setState(next);
        onStateChange?.(next);
      }),
    [controller, onStateChange]
  );
  return state;
}

/** Interactive cross-platform Recipe v2 canvas with drag, pinch, and rotation. */
export function ImageMarkerEditor({
  controller,
  width,
  height,
  background,
  style,
  snapThreshold,
  getLayerSize = defaultLayerSize,
  renderLayer,
  onStateChange,
}: ImageMarkerEditorProps) {
  const state = useEditorState(controller, onStateChange);
  const canvas = React.useMemo(() => ({ width, height }), [height, width]);
  const handleKeyDown = React.useCallback(
    (event: { nativeEvent?: EditorKeyCommand } | EditorKeyCommand) => {
      const command =
        'nativeEvent' in event
          ? event.nativeEvent
          : (event as EditorKeyCommand);
      if (command) controller.handleKeyCommand(command);
    },
    [controller]
  );

  return (
    <View
      accessible
      accessibilityLabel="Image marker editor canvas"
      style={[styles.canvas, { width, height }, style]}
      {...({ onKeyDown: handleKeyDown } as object)}
    >
      {background}
      {state.recipe.layers.map((layer) => (
        <EditorLayer
          key={layer.id}
          canvas={canvas}
          controller={controller}
          layer={layer}
          selected={state.selectedLayerId === layer.id}
          size={getLayerSize(layer)}
          snapThreshold={snapThreshold}
          renderLayer={renderLayer}
        />
      ))}
      {state.snapGuides.map((guide, index) => (
        <Guide
          key={`${guide.axis}-${guide.position}-${index}`}
          guide={guide}
          canvas={canvas}
        />
      ))}
    </View>
  );
}

export interface ImageMarkerEditorToolbarProps {
  controller: ImageMarkerEditorController;
  style?: StyleProp<ViewStyle>;
}

/** Minimal accessible toolbar; applications may replace it with their design system. */
export function ImageMarkerEditorToolbar({
  controller,
  style,
}: ImageMarkerEditorToolbarProps) {
  const state = useEditorState(controller);
  const selected = state.recipe.layers.find(
    (layer) => layer.id === state.selectedLayerId
  );
  const actions = [
    {
      label: 'Undo',
      disabled: !state.canUndo,
      action: () => controller.undo(),
    },
    {
      label: 'Redo',
      disabled: !state.canRedo,
      action: () => controller.redo(),
    },
    {
      label: selected?.visible === false ? 'Show' : 'Hide',
      disabled: !selected || selected.locked,
      action: () =>
        selected &&
        controller.setLayerVisible(selected.id, selected.visible === false),
    },
    {
      label: selected?.locked ? 'Unlock' : 'Lock',
      disabled: !selected,
      action: () =>
        selected && controller.setLayerLocked(selected.id, !selected.locked),
    },
    {
      label: 'Delete',
      disabled: !selected || selected.locked,
      action: () => selected && controller.removeLayer(selected.id),
    },
  ];
  return (
    <View accessibilityLabel="Editor actions" style={[styles.toolbar, style]}>
      {actions.map((action) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: Boolean(action.disabled) }}
          disabled={Boolean(action.disabled)}
          key={action.label}
          onPress={action.action}
          style={({ pressed }) => [
            styles.toolButton,
            pressed && styles.toolButtonPressed,
            action.disabled && styles.toolButtonDisabled,
          ]}
        >
          <Text style={styles.toolButtonText}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    overflow: 'hidden',
    position: 'relative',
  },
  layer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  selectedLayer: {
    borderColor: '#38BDF8',
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  defaultText: {
    textAlign: 'center',
  },
  guide: {
    backgroundColor: '#F43F5E',
    position: 'absolute',
    zIndex: 999,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  toolButton: {
    backgroundColor: '#0F172A',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  toolButtonPressed: {
    opacity: 0.8,
  },
  toolButtonDisabled: {
    opacity: 0.4,
  },
  toolButtonText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
});
