import * as React from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type ImageSourcePropType,
  type ImageStyle,
  type PanResponderGestureState,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type {
  MarkerImageInfo,
  WatermarkRecipeDefinitionLayer,
} from 'react-native-image-marker';
import { ImageMarkerEditorController } from './controller';
import { angle, distance } from './geometry';
import { createEditorViewportProjection } from './projection';
import type {
  EditorAlignment,
  EditorDistribution,
  EditorKeyCommand,
  EditorLayerBounds,
  EditorPoint,
  EditorSize,
  EditorSnapGuide,
  EditorState,
  ImageMarkerEditorRenderAdapter,
} from './types';

export interface EditorLayerRenderContext {
  sourceSize: EditorSize;
  viewportSize: EditorSize;
  scale: number;
}

export interface EditorPluginContext {
  controller: ImageMarkerEditorController;
  state: EditorState;
}

export interface EditorToolbarAction {
  id: string;
  label: string;
  disabled?: boolean;
  onPress(context: EditorPluginContext): void;
}

export interface ImageMarkerEditorPlugin {
  id: string;
  toolbarActions?: readonly EditorToolbarAction[];
  renderCanvasOverlay?: (
    context: EditorPluginContext & EditorLayerRenderContext
  ) => React.ReactNode;
  renderInspectorSection?: (context: EditorPluginContext) => React.ReactNode;
}

export interface EditorComponentSlots {
  canvasOverlay?: (
    context: EditorPluginContext & EditorLayerRenderContext
  ) => React.ReactNode;
  selectionOverlay?: (
    layer: WatermarkRecipeDefinitionLayer,
    context: EditorPluginContext & EditorLayerRenderContext
  ) => React.ReactNode;
  sourceLoading?: React.ReactNode;
}

export interface ImageMarkerEditorProps {
  controller: ImageMarkerEditorController;
  width: number;
  height: number;
  /** Stable identifier for native E2E and application component tests. */
  testID?: string;
  /** Controlled state. Pair with `onStateChange` and controller.replaceState. */
  state?: EditorState;
  /**
   * Explicit source dimensions. Usually omitted when `source` and an adapter
   * with `getSourceInfo` are provided.
   */
  sourceSize?: EditorSize;
  /** Background image source used for automatic Core 2.1 dimension lookup. */
  source?: unknown;
  adapter?: ImageMarkerEditorRenderAdapter;
  background?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  snapThreshold?: number;
  showSafeArea?: boolean;
  getLayerSize?: (layer: WatermarkRecipeDefinitionLayer) => EditorSize;
  renderLayer?: (
    layer: WatermarkRecipeDefinitionLayer,
    selected: boolean,
    context: EditorLayerRenderContext
  ) => React.ReactNode;
  slots?: EditorComponentSlots;
  plugins?: readonly ImageMarkerEditorPlugin[];
  onSourceInfo?: (info: MarkerImageInfo) => void;
  onSourceInfoError?: (error: Error) => void;
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
    const maxWidth =
      typeof layer.style?.maxWidth === 'number'
        ? layer.style.maxWidth
        : undefined;
    return {
      width: Math.max(
        Math.min(layer.text.length * fontSize * 0.62, maxWidth ?? Infinity),
        44
      ),
      height: Math.max(
        (layer.style?.lineHeight ?? fontSize * 1.4) *
          Math.min(layer.style?.maxLines ?? 1, 3),
        32
      ),
    };
  }
  const resolved = Image.resolveAssetSource(layer.src as ImageSourcePropType);
  if (resolved?.width && resolved?.height) {
    return { width: resolved.width, height: resolved.height };
  }
  return { width: 120, height: 80 };
}

function defaultTextStyle(
  layer: Extract<WatermarkRecipeDefinitionLayer, { type: 'text' }>,
  viewportScale: number
): TextStyle {
  return {
    color: layer.style?.color ?? '#FFFFFF',
    fontFamily: layer.style?.fontName,
    fontSize: (layer.style?.fontSize ?? 14) * viewportScale,
    fontWeight: layer.style?.bold ? '700' : '400',
    fontStyle: layer.style?.italic ? 'italic' : 'normal',
    letterSpacing: (layer.style?.letterSpacing ?? 0) * viewportScale,
    lineHeight: layer.style?.lineHeight
      ? layer.style.lineHeight * viewportScale
      : undefined,
    textAlign: layer.style?.textAlign ?? 'left',
    textShadowColor: layer.style?.shadowStyle?.color,
    textShadowOffset: layer.style?.shadowStyle
      ? {
          width: layer.style.shadowStyle.dx * viewportScale,
          height: layer.style.shadowStyle.dy * viewportScale,
        }
      : undefined,
    textShadowRadius: (layer.style?.shadowStyle?.radius ?? 0) * viewportScale,
  };
}

function defaultImageStyle(
  size: EditorSize,
  viewportScale: number
): ImageStyle {
  return {
    width: size.width * viewportScale,
    height: size.height * viewportScale,
  };
}

function positionedLayerStyle(
  layer: WatermarkRecipeDefinitionLayer,
  start: EditorPoint,
  size: EditorSize,
  viewportScale: number
): ViewStyle {
  const transformScale = layer.type === 'image' ? layer.scale ?? 1 : 1;
  return {
    left: start.x * viewportScale,
    top: start.y * viewportScale,
    width: size.width * viewportScale,
    height: size.height * viewportScale,
    opacity: layer.alpha ?? 1,
    transform: [
      { scale: transformScale },
      { rotate: `${layerRotation(layer)}deg` },
    ],
  };
}

function snapGuideStyle(
  guide: EditorSnapGuide,
  canvas: EditorSize,
  viewportScale: number
): ViewStyle {
  return guide.axis === 'x'
    ? {
        left: guide.position * viewportScale,
        top: 0,
        width: 1,
        height: canvas.height * viewportScale,
      }
    : {
        top: guide.position * viewportScale,
        left: 0,
        height: 1,
        width: canvas.width * viewportScale,
      };
}

function DefaultLayer({
  layer,
  size,
  viewportScale,
}: {
  layer: WatermarkRecipeDefinitionLayer;
  size: EditorSize;
  viewportScale: number;
}) {
  if (layer.type === 'text') {
    return (
      <Text
        numberOfLines={layer.style?.maxLines ?? 3}
        style={[styles.defaultText, defaultTextStyle(layer, viewportScale)]}
      >
        {layer.text}
      </Text>
    );
  }
  return (
    <Image
      resizeMode="contain"
      source={layer.src as ImageSourcePropType}
      style={defaultImageStyle(size, viewportScale)}
    />
  );
}

function TransformHandle({
  controller,
  kind,
  layer,
  testID,
}: {
  controller: ImageMarkerEditorController;
  kind: 'north-west' | 'north-east' | 'south-west' | 'south-east' | 'rotate';
  layer: WatermarkRecipeDefinitionLayer;
  testID: string;
}) {
  const baseline = React.useRef({ scale: 1, rotation: 0 });
  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !layer.locked,
        onMoveShouldSetPanResponder: () => !layer.locked,
        onPanResponderGrant() {
          baseline.current = {
            scale: layerScale(layer),
            rotation: layerRotation(layer),
          };
          controller.beginHistoryGroup();
        },
        onPanResponderMove(_event, gesture) {
          if (kind === 'rotate') {
            controller.rotateLayer(
              layer.id,
              baseline.current.rotation + gesture.dx
            );
            return;
          }
          const direction =
            kind === 'north-west' || kind === 'south-west' ? -1 : 1;
          controller.scaleLayer(
            layer.id,
            baseline.current.scale +
              (direction * (gesture.dx + gesture.dy)) / 240
          );
        },
        onPanResponderRelease() {
          controller.endHistoryGroup();
        },
        onPanResponderTerminate() {
          controller.endHistoryGroup();
        },
      }),
    [controller, kind, layer]
  );
  return (
    <View
      {...responder.panHandlers}
      accessibilityLabel={
        kind === 'rotate' ? 'Rotate selected layer' : 'Resize selected layer'
      }
      accessibilityRole="adjustable"
      testID={`${testID}-${kind}`}
      style={[
        styles.handle,
        kind === 'north-west' && styles.handleNorthWest,
        kind === 'north-east' && styles.handleNorthEast,
        kind === 'south-west' && styles.handleSouthWest,
        kind === 'south-east' && styles.handleSouthEast,
        kind === 'rotate' && styles.rotateHandle,
      ]}
    />
  );
}

interface EditorLayerProps {
  sourceCanvas: EditorSize;
  viewportSize: EditorSize;
  viewportScale: number;
  controller: ImageMarkerEditorController;
  layer: WatermarkRecipeDefinitionLayer;
  selected: boolean;
  snapThreshold?: number;
  size: EditorSize;
  renderLayer?: ImageMarkerEditorProps['renderLayer'];
  selectionOverlay?: EditorComponentSlots['selectionOverlay'];
  state: EditorState;
  testID: string;
}

function EditorLayer({
  sourceCanvas,
  viewportSize,
  viewportScale,
  controller,
  layer,
  selected,
  snapThreshold,
  size,
  renderLayer,
  selectionOverlay,
  state,
  testID,
}: EditorLayerProps) {
  const baseline = React.useRef<LayerGestureBaseline>();
  const start = React.useMemo(
    () => ({
      x: coordinate(layer.position?.X, sourceCanvas.width),
      y: coordinate(layer.position?.Y, sourceCanvas.height),
    }),
    [
      layer.position?.X,
      layer.position?.Y,
      sourceCanvas.height,
      sourceCanvas.width,
    ]
  );

  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => !layer.locked,
        onPanResponderGrant(event) {
          if (!state.selectedLayerIds.includes(layer.id)) {
            controller.selectLayer(layer.id);
          }
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
              x: initial.position.x + gesture.dx / viewportScale,
              y: initial.position.y + gesture.dy / viewportScale,
            },
            {
              canvas: sourceCanvas,
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
    [
      controller,
      layer,
      size,
      snapThreshold,
      sourceCanvas,
      start,
      state.selectedLayerIds,
      viewportScale,
    ]
  );

  if (layer.visible === false) return null;
  const context = {
    sourceSize: sourceCanvas,
    viewportSize,
    scale: viewportScale,
  };
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
      testID={`${testID}-layer-${layer.id}`}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'activate') {
          controller.selectLayer(layer.id);
        } else if (!layer.locked) {
          if (event.nativeEvent.actionName === 'increment') {
            controller.scaleLayer(layer.id, layerScale(layer) + 0.05);
          } else if (event.nativeEvent.actionName === 'decrement') {
            controller.scaleLayer(layer.id, layerScale(layer) - 0.05);
          }
        }
      }}
      style={[
        styles.layer,
        positionedLayerStyle(layer, start, size, viewportScale),
        selected && styles.selectedLayer,
      ]}
    >
      {renderLayer?.(layer, selected, context) ?? (
        <DefaultLayer layer={layer} size={size} viewportScale={viewportScale} />
      )}
      {selected && !layer.locked && (
        <>
          <TransformHandle
            controller={controller}
            kind="north-west"
            layer={layer}
            testID={`${testID}-layer-${layer.id}-handle`}
          />
          <TransformHandle
            controller={controller}
            kind="north-east"
            layer={layer}
            testID={`${testID}-layer-${layer.id}-handle`}
          />
          <TransformHandle
            controller={controller}
            kind="south-west"
            layer={layer}
            testID={`${testID}-layer-${layer.id}-handle`}
          />
          <TransformHandle
            controller={controller}
            kind="south-east"
            layer={layer}
            testID={`${testID}-layer-${layer.id}-handle`}
          />
          <TransformHandle
            controller={controller}
            kind="rotate"
            layer={layer}
            testID={`${testID}-layer-${layer.id}-handle`}
          />
        </>
      )}
      {selected &&
        selectionOverlay?.(layer, {
          controller,
          state,
          ...context,
        })}
    </View>
  );
}

function Guide({
  guide,
  canvas,
  viewportScale,
}: {
  guide: EditorSnapGuide;
  canvas: EditorSize;
  viewportScale: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={[styles.guide, snapGuideStyle(guide, canvas, viewportScale)]}
    />
  );
}

function editorStateFingerprint(value: EditorState): string {
  return JSON.stringify({
    recipe: value.recipe,
    selectedLayerIds: value.selectedLayerIds,
    safeArea: value.safeArea,
    exportOptions: value.exportOptions,
    viewport: value.viewport,
  });
}

export function useImageMarkerEditorState(
  controller: ImageMarkerEditorController,
  onStateChange?: (state: EditorState) => void,
  controlledState?: EditorState
): EditorState {
  const [state, setState] = React.useState(() => controller.getState());
  const controlledFingerprint = controlledState
    ? editorStateFingerprint(controlledState)
    : undefined;
  React.useEffect(
    () =>
      controller.subscribe((next) => {
        setState(next);
        onStateChange?.(next);
      }),
    [controller, onStateChange]
  );
  React.useEffect(() => {
    if (
      controlledState &&
      editorStateFingerprint(controller.getState()) !== controlledFingerprint
    ) {
      controller.replaceState(controlledState);
    }
  }, [controlledFingerprint, controlledState, controller]);
  return controlledState ?? state;
}

/** Interactive cross-platform Recipe v2 canvas with drag, handles, and zoom. */
export function ImageMarkerEditor({
  controller,
  width,
  height,
  testID = 'image-marker-editor',
  state: controlledState,
  sourceSize,
  source,
  adapter,
  background,
  style,
  snapThreshold,
  showSafeArea = true,
  getLayerSize = defaultLayerSize,
  renderLayer,
  slots,
  plugins = [],
  onSourceInfo,
  onSourceInfoError,
  onStateChange,
}: ImageMarkerEditorProps) {
  const state = useImageMarkerEditorState(
    controller,
    onStateChange,
    controlledState
  );
  const [detectedSourceSize, setDetectedSourceSize] =
    React.useState<EditorSize>();
  React.useEffect(() => {
    let active = true;
    if (sourceSize || source === undefined || !adapter?.getSourceInfo) {
      setDetectedSourceSize(undefined);
      return () => {
        active = false;
      };
    }
    adapter.getSourceInfo(source).then(
      (info) => {
        if (!active) return;
        setDetectedSourceSize({ width: info.width, height: info.height });
        onSourceInfo?.(info);
      },
      (reason: unknown) => {
        if (!active) return;
        onSourceInfoError?.(
          reason instanceof Error ? reason : new Error(String(reason))
        );
      }
    );
    return () => {
      active = false;
    };
  }, [adapter, onSourceInfo, onSourceInfoError, source, sourceSize]);

  const viewport = React.useMemo(() => ({ width, height }), [height, width]);
  const sourceCanvas = sourceSize ?? detectedSourceSize ?? viewport;
  const baseProjection = React.useMemo(
    () => createEditorViewportProjection(sourceCanvas, viewport),
    [sourceCanvas, viewport]
  );
  const projection = React.useMemo(() => {
    const scale = baseProjection.scale * state.viewport.zoom;
    const content = {
      x:
        baseProjection.content.x +
        (baseProjection.content.width - sourceCanvas.width * scale) / 2 +
        state.viewport.pan.x,
      y:
        baseProjection.content.y +
        (baseProjection.content.height - sourceCanvas.height * scale) / 2 +
        state.viewport.pan.y,
      width: sourceCanvas.width * scale,
      height: sourceCanvas.height * scale,
    };
    return { ...baseProjection, content, scale };
  }, [baseProjection, sourceCanvas, state.viewport]);
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
  const context = {
    controller,
    state,
    sourceSize: sourceCanvas,
    viewportSize: projection.content,
    scale: projection.scale,
  };

  return (
    <View
      accessible={false}
      testID={`${testID}-canvas`}
      style={[styles.canvas, { width, height }, style]}
      {...({
        onKeyDown: handleKeyDown,
        onWheel: (event: { nativeEvent?: { deltaY?: number } }) => {
          const delta = event.nativeEvent?.deltaY ?? 0;
          controller.zoomViewportBy(delta > 0 ? 1 / 1.1 : 1.1);
        },
      } as object)}
    >
      <View
        style={[
          styles.content,
          {
            left: projection.content.x,
            top: projection.content.y,
            width: projection.content.width,
            height: projection.content.height,
          },
        ]}
      >
        {background}
        {showSafeArea && (
          <View
            pointerEvents="none"
            testID={`${testID}-safe-area`}
            style={[
              styles.safeArea,
              {
                left: state.safeArea.left * projection.scale,
                top: state.safeArea.top * projection.scale,
                right: state.safeArea.right * projection.scale,
                bottom: state.safeArea.bottom * projection.scale,
              },
            ]}
          />
        )}
        {state.recipe.layers.map((layer) => (
          <EditorLayer
            key={layer.id}
            controller={controller}
            layer={layer}
            renderLayer={renderLayer}
            selected={state.selectedLayerIds.includes(layer.id)}
            selectionOverlay={slots?.selectionOverlay}
            size={getLayerSize(layer)}
            snapThreshold={snapThreshold}
            sourceCanvas={sourceCanvas}
            state={state}
            viewportScale={projection.scale}
            viewportSize={projection.content}
            testID={testID}
          />
        ))}
        {state.snapGuides.map((guide, index) => (
          <Guide
            key={`${guide.axis}-${guide.position}-${index}`}
            canvas={sourceCanvas}
            guide={guide}
            viewportScale={projection.scale}
          />
        ))}
        {slots?.canvasOverlay?.(context)}
        {plugins.map((plugin) => (
          <React.Fragment key={plugin.id}>
            {plugin.renderCanvasOverlay?.(context)}
          </React.Fragment>
        ))}
      </View>
      {!sourceSize &&
        source !== undefined &&
        !detectedSourceSize &&
        slots?.sourceLoading}
    </View>
  );
}

export interface ImageMarkerEditorToolbarProps {
  controller: ImageMarkerEditorController;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  sourceSize?: EditorSize;
  layerBounds?: readonly EditorLayerBounds[];
  getLayerSize?: (layer: WatermarkRecipeDefinitionLayer) => EditorSize;
  plugins?: readonly ImageMarkerEditorPlugin[];
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

/** Accessible production toolbar with history, selection, groups, and zoom. */
export function ImageMarkerEditorToolbar({
  controller,
  style,
  testID = 'image-marker-editor-toolbar',
  sourceSize,
  layerBounds = [],
  getLayerSize = defaultLayerSize,
  plugins = [],
  leading,
  trailing,
}: ImageMarkerEditorToolbarProps) {
  const state = useImageMarkerEditorState(controller);
  const selected = state.recipe.layers.find(
    (layer) => layer.id === state.selectedLayerId
  );
  const selectionCount = state.selectedLayerIds.length;
  const selectionLocked = state.recipe.layers.some(
    (layer) =>
      state.selectedLayerIds.includes(layer.id) && Boolean(layer.locked)
  );
  const resolvedBounds = React.useMemo(
    () =>
      layerBounds.length > 0
        ? layerBounds
        : state.recipe.layers.map((layer) => {
            const size = getLayerSize(layer);
            const scale = layer.type === 'image' ? layer.scale ?? 1 : 1;
            return {
              id: layer.id,
              x: coordinate(layer.position?.X, sourceSize?.width ?? 0),
              y: coordinate(layer.position?.Y, sourceSize?.height ?? 0),
              width: size.width * scale,
              height: size.height * scale,
            };
          }),
    [getLayerSize, layerBounds, sourceSize, state.recipe.layers]
  );
  const align = (value: EditorAlignment) =>
    controller.alignLayers(value, resolvedBounds, sourceSize);
  const distribute = (value: EditorDistribution) =>
    controller.distributeLayers(value, resolvedBounds);
  const actions: EditorToolbarAction[] = [
    {
      id: 'undo',
      label: 'Undo',
      disabled: !state.canUndo,
      onPress: () => controller.undo(),
    },
    {
      id: 'redo',
      label: 'Redo',
      disabled: !state.canRedo,
      onPress: () => controller.redo(),
    },
    {
      id: 'zoom-out',
      label: '−',
      onPress: () => controller.zoomViewportBy(1 / 1.2),
    },
    {
      id: 'fit',
      label: `${Math.round(state.viewport.zoom * 100)}%`,
      onPress: () => controller.fitViewport(),
    },
    {
      id: 'zoom-in',
      label: '+',
      onPress: () => controller.zoomViewportBy(1.2),
    },
    {
      id: 'pan-left',
      label: '←',
      onPress: () => controller.panViewport({ x: -24, y: 0 }),
    },
    {
      id: 'pan-up',
      label: '↑',
      onPress: () => controller.panViewport({ x: 0, y: -24 }),
    },
    {
      id: 'pan-down',
      label: '↓',
      onPress: () => controller.panViewport({ x: 0, y: 24 }),
    },
    {
      id: 'pan-right',
      label: '→',
      onPress: () => controller.panViewport({ x: 24, y: 0 }),
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      disabled: selectionCount === 0,
      onPress: () => controller.duplicateLayers(),
    },
    {
      id: 'copy',
      label: 'Copy',
      disabled: selectionCount === 0,
      onPress: () => controller.copyLayers(),
    },
    {
      id: 'paste',
      label: 'Paste',
      disabled: !controller.canPaste(),
      onPress: () => controller.pasteLayers(),
    },
    {
      id: 'group',
      label: 'Group',
      disabled: selectionCount < 2 || selectionLocked,
      onPress: () => controller.groupLayers(),
    },
    {
      id: 'ungroup',
      label: 'Ungroup',
      disabled:
        selectionLocked ||
        !state.recipe.layers.some(
          (layer) =>
            state.selectedLayerIds.includes(layer.id) && Boolean(layer.groupId)
        ),
      onPress: () => controller.ungroupLayers(),
    },
    {
      id: 'align-left',
      label: 'Left',
      disabled: selectionCount === 0 || selectionLocked,
      onPress: () => align('left'),
    },
    {
      id: 'align-center',
      label: 'Center',
      disabled: selectionCount === 0 || selectionLocked,
      onPress: () => align('center'),
    },
    {
      id: 'align-right',
      label: 'Right',
      disabled: selectionCount === 0 || selectionLocked,
      onPress: () => align('right'),
    },
    {
      id: 'align-top',
      label: 'Top',
      disabled: selectionCount === 0 || selectionLocked,
      onPress: () => align('top'),
    },
    {
      id: 'align-middle',
      label: 'Middle',
      disabled: selectionCount === 0 || selectionLocked,
      onPress: () => align('middle'),
    },
    {
      id: 'align-bottom',
      label: 'Bottom',
      disabled: selectionCount === 0 || selectionLocked,
      onPress: () => align('bottom'),
    },
    {
      id: 'distribute-horizontal',
      label: 'Distribute H',
      disabled: selectionCount < 3 || selectionLocked,
      onPress: () => distribute('horizontal'),
    },
    {
      id: 'distribute-vertical',
      label: 'Distribute V',
      disabled: selectionCount < 3 || selectionLocked,
      onPress: () => distribute('vertical'),
    },
    {
      id: 'visibility',
      label: selected?.visible === false ? 'Show' : 'Hide',
      disabled: !selected || selected.locked,
      onPress: () =>
        selected &&
        controller.setLayerVisible(selected.id, selected.visible === false),
    },
    {
      id: 'lock',
      label: selected?.locked ? 'Unlock' : 'Lock',
      disabled: !selected,
      onPress: () =>
        selected && controller.setLayerLocked(selected.id, !selected.locked),
    },
    {
      id: 'delete',
      label: 'Delete',
      disabled: !selected || selectionLocked,
      onPress: () => controller.removeLayers(),
    },
    ...plugins.flatMap((plugin) => plugin.toolbarActions ?? []),
  ];
  const context = { controller, state };
  return (
    <View
      accessibilityLabel="Editor actions"
      style={[styles.toolbar, style]}
      testID={testID}
    >
      {leading}
      {actions.map((action) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: Boolean(action.disabled) }}
          disabled={Boolean(action.disabled)}
          key={action.id}
          onPress={() => action.onPress(context)}
          testID={`${testID}-${action.id}`}
          style={({ pressed }) => [
            styles.toolButton,
            pressed && styles.toolButtonPressed,
            action.disabled && styles.toolButtonDisabled,
          ]}
        >
          <Text style={styles.toolButtonText}>{action.label}</Text>
        </Pressable>
      ))}
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    overflow: 'hidden',
    position: 'absolute',
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
  safeArea: {
    borderColor: 'rgba(248,250,252,0.7)',
    borderStyle: 'dashed',
    borderWidth: 1,
    position: 'absolute',
    zIndex: 998,
  },
  handle: {
    backgroundColor: '#F8FAFC',
    borderColor: '#0284C7',
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    position: 'absolute',
    width: 12,
    zIndex: 1000,
  },
  handleNorthWest: { left: -7, top: -7 },
  handleNorthEast: { right: -7, top: -7 },
  handleSouthWest: { bottom: -7, left: -7 },
  handleSouthEast: { bottom: -7, right: -7 },
  rotateHandle: {
    left: '50%',
    marginLeft: -6,
    top: -30,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  toolButton: {
    backgroundColor: '#0F172A',
    borderRadius: 6,
    marginBottom: 8,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
