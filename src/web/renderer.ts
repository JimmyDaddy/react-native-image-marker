import type {
  CornerRadius,
  ImageOptions,
  MarkOptions,
  TextBackgroundStyle,
  TextOptions,
  TextStyle,
  WatermarkImageOptions,
} from '../index';
import {
  createWebCanvas,
  getCanvasContext,
  getSecurityErrorMessage,
  loadWebImage,
} from './browser';
import type {
  LoadedWebImage,
  WebCanvasContext,
  WebTextMetrics,
} from './browser';
import {
  degreesToRadians,
  encodeCanvas,
  fitSizeWithinMax,
  getExpandedCanvasSize,
  getRotatedBounds,
  normalizeOutputFormat,
  normalizeQuality,
  resolveAnchoredPosition,
  resolveSpreadValue,
} from './helpers';
import type { Point, Size } from './helpers';
import { resolveTilePlacements } from '../layout';

export type WebRenderLayer =
  | { type: 'text'; options: TextOptions }
  | { type: 'image'; options: WatermarkImageOptions };

type OutputOptions = Pick<
  MarkOptions,
  'quality' | 'saveFormat' | 'matteColor' | 'rotationCanvasMode' | 'maxSize'
>;

interface SourceBounds extends Size {
  x: number;
  y: number;
}

interface ResolvedPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface ResolvedRadius {
  x: number;
  y: number;
}

interface ResolvedCornerRadii {
  topLeft: ResolvedRadius;
  topRight: ResolvedRadius;
  bottomRight: ResolvedRadius;
  bottomLeft: ResolvedRadius;
}

interface TextLayout {
  lines: Array<{ text: string; width: number }>;
  width: number;
  height: number;
  lineHeight: number;
  fontSize: number;
}

function assertFinitePositive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite number greater than 0.`);
  }
  return value;
}

function resolveScale(value: number | undefined, label: string): number {
  return assertFinitePositive(value ?? 1, label);
}

function resolveAlpha(value: number | undefined, label: string): number {
  const alpha = value ?? 1;
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new Error(`${label} must be a finite number between 0 and 1.`);
  }
  return alpha;
}

function resolveRotation(value: number | undefined, label: string): number {
  const rotation = value ?? 0;
  if (!Number.isFinite(rotation)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return rotation;
}

function escapeFontFamily(fontFamily: string): string {
  return fontFamily.replace(/["\\]/g, '\\$&');
}

function createFont(style: TextStyle | undefined, fontSize: number): string {
  const italic = style?.italic ? 'italic ' : '';
  const weight = style?.bold ? '700 ' : '400 ';
  const family = style?.fontName
    ? `"${escapeFontFamily(style.fontName)}", sans-serif`
    : 'sans-serif';
  return `${italic}${weight}${fontSize}px ${family}`;
}

function resolveFontSize(style: TextStyle | undefined, canvasWidth: number) {
  const fontSize =
    style?.fontSizeRatio !== undefined
      ? canvasWidth * style.fontSizeRatio
      : style?.fontSize ?? 14;
  return assertFinitePositive(fontSize, 'text font size');
}

function metricHeight(metrics: WebTextMetrics, fontSize: number): number {
  const ascent =
    metrics.actualBoundingBoxAscent ??
    metrics.fontBoundingBoxAscent ??
    fontSize * 0.8;
  const descent =
    metrics.actualBoundingBoxDescent ??
    metrics.fontBoundingBoxDescent ??
    fontSize * 0.2;
  return Math.max(ascent + descent, fontSize);
}

function splitOversizedToken(
  context: WebCanvasContext,
  token: string,
  maxWidth: number
): string[] {
  const chunks: string[] = [];
  let chunk = '';

  for (const character of Array.from(token)) {
    const candidate = chunk + character;
    if (chunk && context.measureText(candidate).width > maxWidth) {
      chunks.push(chunk);
      chunk = character;
    } else {
      chunk = candidate;
    }
  }

  if (chunk || chunks.length === 0) {
    chunks.push(chunk);
  }
  return chunks;
}

function wrapParagraph(
  context: WebCanvasContext,
  paragraph: string,
  maxWidth: number
): string[] {
  if (context.measureText(paragraph).width <= maxWidth) {
    return [paragraph];
  }

  const lines: string[] = [];
  const tokens = paragraph.match(/\s+|\S+/gu) ?? [''];
  let current = '';

  for (const token of tokens) {
    if (/^\s+$/u.test(token)) {
      if (current || lines.length === 0) {
        current += token;
      }
      continue;
    }

    const candidate = current + token;
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    const completedLine = current.trimEnd();
    if (completedLine) {
      lines.push(completedLine);
    }
    current = '';

    if (context.measureText(token).width <= maxWidth) {
      current = token;
      continue;
    }

    const chunks = splitOversizedToken(context, token, maxWidth);
    lines.push(...chunks.slice(0, -1));
    current = chunks[chunks.length - 1] ?? '';
  }

  const finalLine = current.trimEnd();
  if (finalLine || lines.length === 0) {
    lines.push(finalLine);
  }
  return lines;
}

function measureTextLayout(
  context: WebCanvasContext,
  text: string,
  style: TextStyle | undefined,
  canvasWidth: number
): TextLayout {
  const fontSize = resolveFontSize(style, canvasWidth);
  context.font = createFont(style, fontSize);
  const lines = text
    .split(/\r\n?|\n/)
    .flatMap((line) => wrapParagraph(context, line, canvasWidth))
    .map((line) => ({
      text: line,
      width: context.measureText(line).width,
    }));
  const representative = context.measureText(
    lines.reduce(
      (widest, line) => (line.width > widest.width ? line : widest),
      lines[0] ?? { text: '', width: 0 }
    ).text || 'Mg'
  );
  const lineHeight = metricHeight(representative, fontSize);

  return {
    lines,
    width: Math.max(...lines.map((line) => line.width), 0),
    height: Math.max(lineHeight * lines.length, 1),
    lineHeight,
    fontSize,
  };
}

function parsePaddingTokens(value: number | string): string[] {
  return typeof value === 'number'
    ? [String(value)]
    : value.trim().split(/\s+/).filter(Boolean).slice(0, 4);
}

function resolveAxisValue(
  value: number | string | undefined,
  relativeTo: number
): number | undefined {
  const resolved = resolveSpreadValue(value, relativeTo);
  return resolved === undefined ? undefined : Math.max(resolved, 0);
}

function resolvePadding(
  style: TextBackgroundStyle,
  canvas: Size
): ResolvedPadding {
  const padding: ResolvedPadding = { top: 0, right: 0, bottom: 0, left: 0 };

  if (style.padding !== undefined) {
    const values = parsePaddingTokens(style.padding);
    const [first = '0', second = first, third = first, fourth = second] =
      values;
    if (values.length === 1) {
      padding.top = resolveAxisValue(first, canvas.height) ?? 0;
      padding.right = resolveAxisValue(first, canvas.width) ?? 0;
      padding.bottom = resolveAxisValue(first, canvas.height) ?? 0;
      padding.left = resolveAxisValue(first, canvas.width) ?? 0;
    } else if (values.length === 2) {
      padding.top = resolveAxisValue(first, canvas.height) ?? 0;
      padding.right = resolveAxisValue(second, canvas.width) ?? 0;
      padding.bottom = padding.top;
      padding.left = padding.right;
    } else if (values.length === 3) {
      padding.top = resolveAxisValue(first, canvas.height) ?? 0;
      padding.right = resolveAxisValue(second, canvas.width) ?? 0;
      padding.bottom = resolveAxisValue(third, canvas.height) ?? 0;
      padding.left = padding.right;
    } else {
      padding.top = resolveAxisValue(first, canvas.height) ?? 0;
      padding.right = resolveAxisValue(second, canvas.width) ?? 0;
      padding.bottom = resolveAxisValue(third, canvas.height) ?? 0;
      padding.left = resolveAxisValue(fourth, canvas.width) ?? 0;
    }
  }

  const horizontal =
    resolveAxisValue(style.paddingHorizontal, canvas.width) ??
    resolveAxisValue(style.paddingX, canvas.width);
  const vertical =
    resolveAxisValue(style.paddingVertical, canvas.height) ??
    resolveAxisValue(style.paddingY, canvas.height);
  if (horizontal !== undefined) {
    padding.left = horizontal;
    padding.right = horizontal;
  }
  if (vertical !== undefined) {
    padding.top = vertical;
    padding.bottom = vertical;
  }

  padding.left =
    resolveAxisValue(style.paddingLeft, canvas.width) ?? padding.left;
  padding.right =
    resolveAxisValue(style.paddingRight, canvas.width) ?? padding.right;
  padding.top =
    resolveAxisValue(style.paddingTop, canvas.height) ?? padding.top;
  padding.bottom =
    resolveAxisValue(style.paddingBottom, canvas.height) ?? padding.bottom;
  return padding;
}

function resolveRadiusValue(
  value: { x: number | string; y: number | string } | undefined,
  rect: Size
): ResolvedRadius {
  return {
    x: Math.max(resolveSpreadValue(value?.x, rect.width) ?? 0, 0),
    y: Math.max(resolveSpreadValue(value?.y, rect.height) ?? 0, 0),
  };
}

function resolveCornerRadii(
  cornerRadius: CornerRadius | undefined,
  rect: Size
): ResolvedCornerRadii {
  const all = resolveRadiusValue(cornerRadius?.all, rect);
  const resolveCorner = (
    value: { x: number | string; y: number | string } | undefined
  ) => {
    const resolved = value ? resolveRadiusValue(value, rect) : all;
    return {
      x: Math.min(resolved.x, rect.width / 2),
      y: Math.min(resolved.y, rect.height / 2),
    };
  };
  return {
    topLeft: resolveCorner(cornerRadius?.topLeft),
    topRight: resolveCorner(cornerRadius?.topRight),
    bottomRight: resolveCorner(cornerRadius?.bottomRight),
    bottomLeft: resolveCorner(cornerRadius?.bottomLeft),
  };
}

function roundedRectPath(
  context: WebCanvasContext,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: CornerRadius | undefined
) {
  const radii = resolveCornerRadii(cornerRadius, { width, height });
  context.beginPath();
  context.moveTo(x + radii.topLeft.x, y);
  context.lineTo(x + width - radii.topRight.x, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radii.topRight.y);
  context.lineTo(x + width, y + height - radii.bottomRight.y);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radii.bottomRight.x,
    y + height
  );
  context.lineTo(x + radii.bottomLeft.x, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radii.bottomLeft.y);
  context.lineTo(x, y + radii.topLeft.y);
  context.quadraticCurveTo(x, y, x + radii.topLeft.x, y);
  context.closePath();
}

function drawTextBackground(
  context: WebCanvasContext,
  style: TextBackgroundStyle,
  origin: Point,
  layout: TextLayout,
  canvas: Size,
  outlineInset = 0
) {
  const padding = resolvePadding(style, canvas);
  let x = origin.x - outlineInset - padding.left;
  let y = origin.y - outlineInset - padding.top;
  let width = layout.width + outlineInset * 2 + padding.left + padding.right;
  let height = layout.height + outlineInset * 2 + padding.top + padding.bottom;

  if ((style.type as string | null | undefined) === 'stretchX') {
    x = 0;
    width = canvas.width;
  } else if ((style.type as string | null | undefined) === 'stretchY') {
    y = 0;
    height = canvas.height;
  }

  context.fillStyle = style.color;
  roundedRectPath(context, x, y, width, height, style.cornerRadius);
  context.fill();
}

function getAlignedTextX(
  alignment: TextStyle['textAlign'],
  originX: number,
  layoutWidth: number
) {
  if (alignment === 'center') {
    return originX + layoutWidth / 2;
  }
  if (alignment === 'right') {
    return originX + layoutWidth;
  }
  return originX;
}

function getLineStartX(
  alignment: TextStyle['textAlign'],
  textX: number,
  lineWidth: number
) {
  if (alignment === 'center') {
    return textX - lineWidth / 2;
  }
  if (alignment === 'right') {
    return textX - lineWidth;
  }
  return textX;
}

function drawTextDecorations(
  context: WebCanvasContext,
  options: TextOptions,
  layout: TextLayout,
  textX: number,
  lineIndex: number,
  lineWidth: number
) {
  if (!options.style?.underline && !options.style?.strikeThrough) {
    return;
  }

  const lineStart = getLineStartX(options.style.textAlign, textX, lineWidth);
  const top = lineIndex * layout.lineHeight;
  context.beginPath();
  if (options.style.underline) {
    context.moveTo(lineStart, top + layout.fontSize);
    context.lineTo(lineStart + lineWidth, top + layout.fontSize);
  }
  if (options.style.strikeThrough) {
    context.moveTo(lineStart, top + layout.fontSize * 0.52);
    context.lineTo(lineStart + lineWidth, top + layout.fontSize * 0.52);
  }
  const stroke = context as WebCanvasContext & {
    lineWidth: number;
    strokeStyle: unknown;
    stroke(): void;
  };
  stroke.lineWidth = Math.max(layout.fontSize / 16, 1);
  stroke.strokeStyle = options.style.color ?? '#000000';
  stroke.stroke();
}

function drawTextAtPosition(
  context: WebCanvasContext,
  options: TextOptions,
  canvas: Size,
  layout: TextLayout,
  visualPosition: Point,
  rotation: number
) {
  const style = options.style;
  const strokeWidth = style?.strokeStyle?.width ?? 0;
  const outlineInset = strokeWidth / 2;
  const visualSize = {
    width: layout.width + outlineInset * 2,
    height: layout.height + outlineInset * 2,
  };
  const position = {
    x: visualPosition.x + outlineInset,
    y: visualPosition.y + outlineInset,
  };

  context.save();
  try {
    if (rotation !== 0) {
      context.translate(
        visualPosition.x + visualSize.width / 2,
        visualPosition.y + visualSize.height / 2
      );
      context.rotate(degreesToRadians(rotation));
      context.translate(
        -(visualPosition.x + visualSize.width / 2),
        -(visualPosition.y + visualSize.height / 2)
      );
    }

    if (style?.textBackgroundStyle) {
      drawTextBackground(
        context,
        style.textBackgroundStyle,
        position,
        layout,
        canvas,
        outlineInset
      );
    }

    context.font = createFont(style, layout.fontSize);
    context.fillStyle = style?.color ?? '#000000';
    context.textAlign = style?.textAlign ?? 'left';
    context.textBaseline = 'top';
    context.shadowBlur = style?.shadowStyle?.radius ?? 0;
    context.shadowOffsetX = style?.shadowStyle?.dx ?? 0;
    context.shadowOffsetY = style?.shadowStyle?.dy ?? 0;
    context.shadowColor = style?.shadowStyle?.color ?? 'transparent';
    context.lineJoin = 'round';
    context.lineWidth = strokeWidth;
    context.strokeStyle = style?.strokeStyle?.color ?? '#000000';

    const textX = getAlignedTextX(style?.textAlign, position.x, layout.width);
    if (style?.skewX) {
      context.translate(position.x, position.y);
      context.transform(1, 0, style.skewX, 1, 0, 0);
      context.translate(-position.x, -position.y);
    }

    layout.lines.forEach((line, lineIndex) => {
      const lineY = position.y + lineIndex * layout.lineHeight;
      if (strokeWidth > 0) {
        context.strokeText(line.text, textX, lineY);
        const shadowColor = context.shadowColor;
        context.shadowColor = 'transparent';
        context.fillText(line.text, textX, lineY);
        context.shadowColor = shadowColor;
      } else {
        context.fillText(line.text, textX, lineY);
      }
      context.save();
      context.translate(position.x, position.y);
      drawTextDecorations(
        context,
        options,
        layout,
        textX - position.x,
        lineIndex,
        line.width
      );
      context.restore();
    });
  } finally {
    context.restore();
  }
}

function drawTextLayer(
  context: WebCanvasContext,
  options: TextOptions,
  canvas: Size
) {
  const style = options.style;
  const textLayout = measureTextLayout(
    context,
    options.text,
    style,
    canvas.width
  );
  const rotation = resolveRotation(style?.rotate, 'text rotation');
  const strokeWidth = style?.strokeStyle?.width ?? 0;
  const outlineInset = strokeWidth / 2;
  const visualSize = {
    width: textLayout.width + outlineInset * 2,
    height: textLayout.height + outlineInset * 2,
  };

  if (options.layout?.type === 'tile') {
    const rotatedSize = getRotatedBounds(visualSize, rotation);
    const placements = resolveTilePlacements(
      options.layout,
      canvas,
      rotatedSize
    );
    const originInset = {
      x: (rotatedSize.width - visualSize.width) / 2,
      y: (rotatedSize.height - visualSize.height) / 2,
    };
    placements.forEach((placement) => {
      drawTextAtPosition(
        context,
        options,
        canvas,
        textLayout,
        {
          x: placement.x + originInset.x,
          y: placement.y + originInset.y,
        },
        rotation
      );
    });
    return;
  }

  const position = resolveAnchoredPosition(
    options.position ?? options.positionOptions,
    canvas,
    visualSize,
    20
  );
  drawTextAtPosition(context, options, canvas, textLayout, position, rotation);
}

function fullSourceBounds(image: LoadedWebImage): SourceBounds {
  return { x: 0, y: 0, width: image.width, height: image.height };
}

function getVisibleSourceBounds(image: LoadedWebImage): SourceBounds {
  const canvas = createWebCanvas(image.width, image.height);
  const context = getCanvasContext(canvas);
  context.drawImage(image.image, 0, 0);

  let pixels: ArrayLike<number>;
  try {
    pixels = context.getImageData(0, 0, image.width, image.height).data;
  } catch (error) {
    const name =
      error && typeof error === 'object' && 'name' in error
        ? String((error as { name?: unknown }).name)
        : '';
    if (name === 'SecurityError') {
      throw new Error(getSecurityErrorMessage('trim transparent padding'));
    }
    throw error;
  }

  let left = image.width;
  let top = image.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = pixels[(y * image.width + x) * 4 + 3] ?? 0;
      if (alpha > 0) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }

  return right < left || bottom < top
    ? fullSourceBounds(image)
    : {
        x: left,
        y: top,
        width: right - left + 1,
        height: bottom - top + 1,
      };
}

async function drawImageLayer(
  context: WebCanvasContext,
  options: WatermarkImageOptions,
  canvas: Size,
  maxSize: number | undefined
) {
  const image = await loadWebImage(options.src);
  try {
    const sourceBounds = options.trimTransparentPadding
      ? getVisibleSourceBounds(image)
      : fullSourceBounds(image);
    const boundedImageSize = fitSizeWithinMax(image, maxSize);
    const decodeScale = boundedImageSize.width / image.width;
    const scale =
      resolveScale(options.scale, 'watermark image scale') * decodeScale;
    const alpha = resolveAlpha(options.alpha, 'watermark image alpha');
    const rotation = resolveRotation(
      options.rotate,
      'watermark image rotation'
    );
    const scaledSize = {
      width: sourceBounds.width * scale,
      height: sourceBounds.height * scale,
    };
    const rotatedBounds = getRotatedBounds(scaledSize, rotation);
    const positions =
      options.layout?.type === 'tile'
        ? resolveTilePlacements(options.layout, canvas, rotatedBounds)
        : [resolveAnchoredPosition(options.position, canvas, rotatedBounds, 0)];

    positions.forEach((position) => {
      context.save();
      try {
        context.globalAlpha = alpha;
        context.imageSmoothingEnabled = false;
        context.translate(
          position.x - rotatedBounds.left,
          position.y - rotatedBounds.top
        );
        context.rotate(degreesToRadians(rotation));
        context.scale(scale, scale);
        context.drawImage(
          image.image,
          sourceBounds.x,
          sourceBounds.y,
          sourceBounds.width,
          sourceBounds.height,
          0,
          0,
          sourceBounds.width,
          sourceBounds.height
        );
      } finally {
        context.restore();
      }
    });
  } finally {
    image.cleanup();
  }
}

function validateRotationCanvasMode(mode: string | undefined) {
  const resolved = mode ?? 'expand';
  if (resolved !== 'expand' && resolved !== 'crop') {
    throw new Error(`Unsupported rotation canvas mode: ${resolved}.`);
  }
  return resolved;
}

function normalizeMatteColor(value: string | undefined): string {
  const resolved = value ?? '#FFFFFF';
  const match =
    typeof resolved === 'string'
      ? /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(resolved)
      : null;
  const hex = match?.[1];
  if (!hex) {
    throw new Error('matteColor must use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA.');
  }

  const expanded =
    hex.length <= 4
      ? Array.from(hex)
          .map((character) => character + character)
          .join('')
      : hex;
  return `#${expanded.slice(0, 6).toUpperCase()}`;
}

/** Render a complete composition into a data URL. */
export async function renderWebComposition(
  backgroundImage: ImageOptions,
  layers: WebRenderLayer[],
  output: OutputOptions
): Promise<string> {
  if (!backgroundImage?.src) {
    throw new Error('please set image!');
  }

  const format = normalizeOutputFormat(output.saveFormat as string | undefined);
  normalizeQuality(output.quality);
  const matteColor = normalizeMatteColor(output.matteColor);
  const canvasMode = validateRotationCanvasMode(
    output.rotationCanvasMode as string | undefined
  );
  const backgroundScale = resolveScale(
    backgroundImage.scale,
    'background image scale'
  );
  const backgroundAlpha = resolveAlpha(
    backgroundImage.alpha,
    'background image alpha'
  );
  const backgroundRotation = resolveRotation(
    backgroundImage.rotate,
    'background image rotation'
  );
  const background = await loadWebImage(backgroundImage.src);

  try {
    const boundedBackgroundSize = fitSizeWithinMax(background, output.maxSize);
    const compositionSize = {
      width: Math.max(
        Math.round(boundedBackgroundSize.width * backgroundScale),
        1
      ),
      height: Math.max(
        Math.round(boundedBackgroundSize.height * backgroundScale),
        1
      ),
    };
    const outputSize =
      canvasMode === 'expand'
        ? getExpandedCanvasSize(compositionSize, backgroundRotation)
        : compositionSize;
    const canvas = createWebCanvas(outputSize.width, outputSize.height);
    const context = getCanvasContext(canvas);

    if (format === 'jpg') {
      context.fillStyle = matteColor;
      context.fillRect(0, 0, outputSize.width, outputSize.height);
    }

    context.save();
    try {
      if (backgroundRotation !== 0) {
        context.translate(outputSize.width / 2, outputSize.height / 2);
        context.rotate(degreesToRadians(backgroundRotation));
        context.translate(
          -compositionSize.width / 2,
          -compositionSize.height / 2
        );
      }

      context.save();
      try {
        context.globalAlpha = backgroundAlpha;
        context.imageSmoothingEnabled = true;
        context.drawImage(
          background.image,
          0,
          0,
          compositionSize.width,
          compositionSize.height
        );
      } finally {
        context.restore();
      }

      for (const layer of layers) {
        if (layer.type === 'text') {
          drawTextLayer(context, layer.options, compositionSize);
        } else {
          await drawImageLayer(
            context,
            layer.options,
            compositionSize,
            output.maxSize
          );
        }
      }
    } finally {
      context.restore();
    }

    return encodeCanvas(canvas, format, output.quality);
  } finally {
    background.cleanup();
  }
}
