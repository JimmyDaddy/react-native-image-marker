import type {
  EditorPoint,
  EditorRect,
  EditorSize,
  WatermarkRecipeDefinition,
  WatermarkRecipeDefinitionLayer,
} from './types';

type Measure = number | string | undefined;

export interface EditorViewportProjection {
  source: EditorSize;
  viewport: EditorSize;
  content: EditorRect;
  scale: number;
}

function assertSize(size: EditorSize, label: string): void {
  if (
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height) ||
    size.width <= 0 ||
    size.height <= 0
  ) {
    throw new Error(
      `${label} dimensions must be finite numbers greater than 0.`
    );
  }
}

function scaleMeasure(value: Measure, factor: number): Measure {
  if (typeof value === 'number') return value * factor;
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  if (!normalized || normalized.endsWith('%')) return value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? String(parsed * factor) : value;
}

function scalePadding(value: Measure, factor: number): Measure {
  if (typeof value === 'number') return value * factor;
  if (typeof value !== 'string') return value;
  return value
    .trim()
    .split(/\s+/)
    .map((part) => scaleMeasure(part, factor))
    .join(' ');
}

function projectPosition(
  layer: WatermarkRecipeDefinitionLayer,
  scaleX: number,
  scaleY: number,
  scale: number
) {
  const position = layer.position;
  const defaultInset = layer.type === 'text' ? 20 : 0;
  if (position?.position) {
    return {
      ...position,
      X: scaleMeasure(position.X, scaleX),
      Y: scaleMeasure(position.Y, scaleY),
      edgeInset:
        position.edgeInset === undefined
          ? 20 * scale
          : scaleMeasure(position.edgeInset, scale),
    };
  }
  return {
    ...position,
    X:
      position?.X === undefined
        ? defaultInset * scaleX
        : scaleMeasure(position.X, scaleX),
    Y:
      position?.Y === undefined
        ? defaultInset * scaleY
        : scaleMeasure(position.Y, scaleY),
    edgeInset:
      position?.edgeInset === undefined
        ? undefined
        : scaleMeasure(position.edgeInset, scale),
  };
}

function projectLayout(
  layer: WatermarkRecipeDefinitionLayer,
  scaleX: number,
  scaleY: number
) {
  if (layer.layout?.type !== 'tile') return layer.layout && { ...layer.layout };
  return {
    ...layer.layout,
    gapX: scaleMeasure(layer.layout.gapX, scaleX),
    gapY: scaleMeasure(layer.layout.gapY, scaleY),
    offsetX: scaleMeasure(layer.layout.offsetX, scaleX),
    offsetY: scaleMeasure(layer.layout.offsetY, scaleY),
  };
}

function projectTextLayer(
  layer: Extract<WatermarkRecipeDefinitionLayer, { type: 'text' }>,
  scaleX: number,
  scaleY: number,
  scale: number
): WatermarkRecipeDefinitionLayer {
  const style = layer.style;
  const background = style?.textBackgroundStyle;
  const cornerRadius = background?.cornerRadius;
  return {
    ...layer,
    position: projectPosition(layer, scaleX, scaleY, scale),
    layout: projectLayout(layer, scaleX, scaleY),
    style: {
      ...style,
      fontSize:
        style?.fontSizeRatio === undefined
          ? (style?.fontSize ?? 14) * scale
          : style.fontSize,
      shadowStyle: style?.shadowStyle
        ? {
            ...style.shadowStyle,
            dx: style.shadowStyle.dx * scaleX,
            dy: style.shadowStyle.dy * scaleY,
            radius: style.shadowStyle.radius * scale,
          }
        : style?.shadowStyle,
      strokeStyle: style?.strokeStyle
        ? {
            ...style.strokeStyle,
            width: style.strokeStyle.width * scale,
          }
        : style?.strokeStyle,
      textBackgroundStyle: background
        ? {
            ...background,
            padding: scalePadding(background.padding, scale),
            paddingLeft: scaleMeasure(background.paddingLeft, scaleX),
            paddingRight: scaleMeasure(background.paddingRight, scaleX),
            paddingTop: scaleMeasure(background.paddingTop, scaleY),
            paddingBottom: scaleMeasure(background.paddingBottom, scaleY),
            paddingHorizontal: scaleMeasure(
              background.paddingHorizontal,
              scaleX
            ),
            paddingVertical: scaleMeasure(background.paddingVertical, scaleY),
            paddingX: scaleMeasure(background.paddingX, scaleX),
            paddingY: scaleMeasure(background.paddingY, scaleY),
            cornerRadius: cornerRadius
              ? Object.fromEntries(
                  Object.entries(cornerRadius).map(([key, value]) => [
                    key,
                    value
                      ? {
                          x: scaleMeasure(value.x, scaleX),
                          y: scaleMeasure(value.y, scaleY),
                        }
                      : value,
                  ])
                )
              : cornerRadius,
          }
        : background,
    },
  };
}

function projectImageLayer(
  layer: Extract<WatermarkRecipeDefinitionLayer, { type: 'image' }>,
  scaleX: number,
  scaleY: number,
  scale: number
): WatermarkRecipeDefinitionLayer {
  return {
    ...layer,
    position: projectPosition(layer, scaleX, scaleY, scale),
    layout: projectLayout(layer, scaleX, scaleY),
    scale: (layer.scale ?? 1) * scale,
  };
}

export function fitEditorSizeWithinMax(
  source: EditorSize,
  maxSize: number
): EditorSize {
  assertSize(source, 'sourceSize');
  if (!Number.isFinite(maxSize) || maxSize <= 0) {
    throw new Error('maxSize must be a finite number greater than 0.');
  }
  const largest = Math.max(source.width, source.height);
  if (largest <= maxSize) return { ...source };
  const scale = maxSize / largest;
  return {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
}

export function createEditorViewportProjection(
  source: EditorSize,
  viewport: EditorSize
): EditorViewportProjection {
  assertSize(source, 'sourceSize');
  assertSize(viewport, 'viewport');
  const scale = Math.min(
    viewport.width / source.width,
    viewport.height / source.height
  );
  const width = source.width * scale;
  const height = source.height * scale;
  return {
    source: { ...source },
    viewport: { ...viewport },
    scale,
    content: {
      x: (viewport.width - width) / 2,
      y: (viewport.height - height) / 2,
      width,
      height,
    },
  };
}

export function projectEditorPoint(
  point: EditorPoint,
  projection: EditorViewportProjection
): EditorPoint {
  return {
    x: projection.content.x + point.x * projection.scale,
    y: projection.content.y + point.y * projection.scale,
  };
}

export function unprojectEditorPoint(
  point: EditorPoint,
  projection: EditorViewportProjection
): EditorPoint {
  return {
    x: (point.x - projection.content.x) / projection.scale,
    y: (point.y - projection.content.y) / projection.scale,
  };
}

export function projectEditorRecipe(
  recipe: WatermarkRecipeDefinition,
  source: EditorSize,
  target: EditorSize
): WatermarkRecipeDefinition {
  assertSize(source, 'sourceSize');
  assertSize(target, 'targetSize');
  const scaleX = target.width / source.width;
  const scaleY = target.height / source.height;
  const scale = Math.min(scaleX, scaleY);
  return {
    schemaVersion: 2,
    layers: recipe.layers.map((layer) =>
      layer.type === 'text'
        ? projectTextLayer(layer, scaleX, scaleY, scale)
        : projectImageLayer(layer, scaleX, scaleY, scale)
    ),
    output: { ...recipe.output },
  };
}
