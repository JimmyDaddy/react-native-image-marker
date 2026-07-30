import type {
  WatermarkBlendMode,
  WatermarkPositionOptions,
  WatermarkTextLayer,
} from '@image-marker/recipe';

export interface OverlaySize {
  width: number;
  height: number;
}

export interface OverlayPosition {
  left: number;
  top: number;
}

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function resolveMeasure(
  value: number | string | undefined,
  relativeTo: number,
  fallback = 0
): number {
  if (typeof value === 'number') return finite(value, fallback);
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  return normalized.endsWith('%') ? (relativeTo * parsed) / 100 : parsed;
}

export function resolveOverlayPosition(
  position: WatermarkPositionOptions | undefined,
  canvas: OverlaySize,
  overlay: OverlaySize
): OverlayPosition {
  const inset = resolveMeasure(
    position?.edgeInset,
    Math.min(canvas.width, canvas.height),
    0
  );
  let left = resolveMeasure(position?.X, canvas.width, 0);
  let top = resolveMeasure(position?.Y, canvas.height, 0);
  switch (position?.position) {
    case 'topLeft':
      left += inset;
      top += inset;
      break;
    case 'topCenter':
      left += (canvas.width - overlay.width) / 2;
      top += inset;
      break;
    case 'topRight':
      left += canvas.width - overlay.width - inset;
      top += inset;
      break;
    case 'bottomLeft':
      left += inset;
      top += canvas.height - overlay.height - inset;
      break;
    case 'bottomCenter':
      left += (canvas.width - overlay.width) / 2;
      top += canvas.height - overlay.height - inset;
      break;
    case 'bottomRight':
      left += canvas.width - overlay.width - inset;
      top += canvas.height - overlay.height - inset;
      break;
    case 'center':
      left += (canvas.width - overlay.width) / 2;
      top += (canvas.height - overlay.height) / 2;
      break;
    default:
      break;
  }
  return {
    left: Math.round(left),
    top: Math.round(top),
  };
}

export function tileOverlayPositions(
  base: OverlayPosition,
  canvas: OverlaySize,
  overlay: OverlaySize,
  layout:
    | {
        type: 'tile';
        gapX?: number | string;
        gapY?: number | string;
        offsetX?: number | string;
        offsetY?: number | string;
        stagger?: boolean;
      }
    | undefined
): OverlayPosition[] {
  if (!layout) return [base];
  const gapX = Math.max(
    1,
    resolveMeasure(layout.gapX, canvas.width, overlay.width * 0.35)
  );
  const gapY = Math.max(
    1,
    resolveMeasure(layout.gapY, canvas.height, overlay.height * 0.35)
  );
  const stepX = Math.max(1, overlay.width + gapX);
  const stepY = Math.max(1, overlay.height + gapY);
  const offsetX = resolveMeasure(layout.offsetX, canvas.width, base.left);
  const offsetY = resolveMeasure(layout.offsetY, canvas.height, base.top);
  const positions: OverlayPosition[] = [];
  let row = 0;
  for (let top = offsetY - stepY; top < canvas.height + stepY; top += stepY) {
    const stagger = layout.stagger && row % 2 !== 0 ? stepX / 2 : 0;
    for (
      let left = offsetX - stepX + stagger;
      left < canvas.width + stepX;
      left += stepX
    ) {
      positions.push({ left: Math.round(left), top: Math.round(top) });
    }
    row += 1;
  }
  return positions;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function truncateWithEllipsis(value: string, maximum: number): string {
  if (maximum <= 1) return '…';
  const points = [...value];
  return points.length > maximum
    ? `${points.slice(0, maximum - 1).join('')}…`
    : value;
}

function wrapText(
  text: string,
  maximumCharacters: number,
  mode: 'word' | 'character' | 'none',
  maximumLines: number | undefined,
  overflow: 'clip' | 'ellipsis'
): string[] {
  const output: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    if (mode === 'none') {
      output.push(
        overflow === 'ellipsis'
          ? truncateWithEllipsis(paragraph, maximumCharacters)
          : paragraph
      );
      continue;
    }
    if (mode === 'character') {
      const characters = [...paragraph];
      for (
        let offset = 0;
        offset < characters.length;
        offset += maximumCharacters
      ) {
        output.push(
          characters.slice(offset, offset + maximumCharacters).join('')
        );
      }
      if (characters.length === 0) output.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if ([...candidate].length <= maximumCharacters || !line) {
        line = candidate;
      } else {
        output.push(line);
        line = word;
      }
    }
    output.push(line);
  }
  if (!maximumLines || output.length <= maximumLines) return output;
  const visible = output.slice(0, maximumLines);
  if (overflow === 'ellipsis') {
    const finalLine = visible[visible.length - 1] ?? '';
    visible[visible.length - 1] = truncateWithEllipsis(
      `${finalLine}…`,
      maximumCharacters
    );
  }
  return visible;
}

export function createTextSvg(
  layer: WatermarkTextLayer,
  canvasWidth: number
): { data: Buffer; size: OverlaySize } {
  const style = layer.style ?? {};
  const fontSize = Math.max(1, style.fontSize ?? 14);
  const lineHeight = Math.max(fontSize, style.lineHeight ?? fontSize * 1.25);
  const letterSpacing = style.letterSpacing ?? 0;
  const maximumWidth = Math.max(
    1,
    resolveMeasure(
      style.maxWidth,
      canvasWidth,
      Math.max([...layer.text].length * fontSize * 0.62, fontSize)
    )
  );
  const characterWidth = Math.max(1, fontSize * 0.62 + letterSpacing);
  const maximumCharacters = Math.max(
    1,
    Math.floor(maximumWidth / characterWidth)
  );
  const lines = wrapText(
    layer.text,
    maximumCharacters,
    style.wrap ?? 'word',
    style.maxLines,
    style.overflow ?? 'clip'
  );
  const background = style.textBackgroundStyle;
  const paddingX = resolveMeasure(
    background?.paddingX ??
      background?.paddingHorizontal ??
      background?.padding,
    maximumWidth,
    0
  );
  const paddingY = resolveMeasure(
    background?.paddingY ?? background?.paddingVertical ?? background?.padding,
    lineHeight,
    0
  );
  const paddingLeft = resolveMeasure(
    background?.paddingLeft,
    maximumWidth,
    paddingX
  );
  const paddingRight = resolveMeasure(
    background?.paddingRight,
    maximumWidth,
    paddingX
  );
  const paddingTop = resolveMeasure(
    background?.paddingTop,
    lineHeight,
    paddingY
  );
  const paddingBottom = resolveMeasure(
    background?.paddingBottom,
    lineHeight,
    paddingY
  );
  const textWidth = Math.min(
    maximumWidth,
    Math.max(
      fontSize,
      ...lines.map((line) => [...line].length * characterWidth)
    )
  );
  const width = Math.max(1, Math.ceil(textWidth + paddingLeft + paddingRight));
  const height = Math.max(
    1,
    Math.ceil(lines.length * lineHeight + paddingTop + paddingBottom)
  );
  const anchor =
    style.textAlign === 'right'
      ? 'end'
      : style.textAlign === 'center'
      ? 'middle'
      : 'start';
  const x =
    anchor === 'end'
      ? width - paddingRight
      : anchor === 'middle'
      ? paddingLeft + textWidth / 2
      : paddingLeft;
  const direction =
    style.direction === 'rtl' ||
    (style.direction !== 'ltr' && /[\u0590-\u08ff]/u.test(layer.text))
      ? 'rtl'
      : 'ltr';
  const stroke = style.strokeStyle;
  const shadow = style.shadowStyle;
  const radius = background?.cornerRadius?.all
    ? resolveMeasure(background.cornerRadius.all.x, width, 0)
    : 0;
  const lineElements = lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${paddingTop + fontSize + index * lineHeight}" ` +
        `text-anchor="${anchor}">${escapeXml(line)}</text>`
    )
    .join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    (shadow
      ? `<defs><filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">` +
        `<feDropShadow dx="${shadow.dx}" dy="${shadow.dy}" stdDeviation="${shadow.radius}" ` +
        `flood-color="${escapeXml(shadow.color)}"/></filter></defs>`
      : '') +
    (background
      ? `<rect width="100%" height="100%" rx="${radius}" fill="${escapeXml(
          background.color
        )}"/>`
      : '') +
    `<g fill="${escapeXml(style.color ?? '#FFFFFF')}" ` +
    `font-family="${escapeXml(
      [style.fontName, ...(style.fontFallbacks ?? []), 'sans-serif']
        .filter(Boolean)
        .join(', ')
    )}" ` +
    `font-size="${fontSize}" font-weight="${style.bold ? '700' : '400'}" ` +
    `font-style="${style.italic ? 'italic' : 'normal'}" ` +
    `letter-spacing="${letterSpacing}" direction="${direction}" ` +
    `text-decoration="${[
      style.underline ? 'underline' : '',
      style.strikeThrough ? 'line-through' : '',
    ]
      .filter(Boolean)
      .join(' ')}" ` +
    `opacity="${Math.max(0, Math.min(layer.alpha ?? 1, 1))}" ` +
    (shadow ? `filter="url(#shadow)" ` : '') +
    (stroke
      ? `stroke="${escapeXml(stroke.color)}" stroke-width="${
          stroke.width
        }" paint-order="stroke" `
      : '') +
    `>${lineElements}</g></svg>`;
  return { data: Buffer.from(svg), size: { width, height } };
}

export function sharpBlendMode(
  blendMode: WatermarkBlendMode | undefined
): 'over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' {
  return blendMode === undefined || blendMode === 'normal' ? 'over' : blendMode;
}
