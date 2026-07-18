import type { WatermarkLayout } from './index';

export const MAX_TILE_COPIES = 4096;

export interface LayoutSize {
  width: number;
  height: number;
}

export interface LayoutPoint {
  x: number;
  y: number;
}

export type TileWatermarkLayout = Extract<WatermarkLayout, { type: 'tile' }>;

function assertSize(size: LayoutSize, label: string): void {
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

export function resolveLayoutValue(
  value: number | string | undefined,
  relativeTo: number,
  label: string
): number {
  if (value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`${label} must be a finite number or percentage.`);
    }
    return value;
  }

  const normalized = value.trim();
  const match = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))(%)?$/.exec(normalized);
  if (!match) {
    throw new Error(`${label} must be a finite number or percentage.`);
  }
  const parsed = Number(match[1]);
  return match[2] ? (relativeTo * parsed) / 100 : parsed;
}

function normalizedOffset(value: number, step: number): number {
  return ((value % step) + step) % step;
}

/**
 * Resolve the top-left visible bounds for every tile. Rows and columns begin
 * one step outside the canvas so partial edge tiles preserve the grid phase.
 */
export function resolveTilePlacements(
  layout: TileWatermarkLayout,
  canvas: LayoutSize,
  item: LayoutSize
): LayoutPoint[] {
  assertSize(canvas, 'canvas');
  assertSize(item, 'watermark');

  const gapX = resolveLayoutValue(layout.gapX, canvas.width, 'layout.gapX');
  const gapY = resolveLayoutValue(layout.gapY, canvas.height, 'layout.gapY');
  if (gapX < 0 || gapY < 0) {
    throw new Error('layout gaps must be non-negative.');
  }

  const offsetX = resolveLayoutValue(
    layout.offsetX,
    canvas.width,
    'layout.offsetX'
  );
  const offsetY = resolveLayoutValue(
    layout.offsetY,
    canvas.height,
    'layout.offsetY'
  );
  const stepX = item.width + gapX;
  const stepY = item.height + gapY;
  if (!Number.isFinite(stepX) || !Number.isFinite(stepY)) {
    throw new Error('tile layout step must be finite.');
  }

  const phaseX = normalizedOffset(offsetX, stepX);
  const phaseY = normalizedOffset(offsetY, stepY);
  const placements: LayoutPoint[] = [];

  for (
    let row = -1, y = phaseY - stepY;
    y < canvas.height;
    row += 1, y += stepY
  ) {
    if (y + item.height <= 0) {
      continue;
    }
    const staggerOffset = layout.stagger && row % 2 !== 0 ? stepX / 2 : 0;
    const rowPhaseX = normalizedOffset(phaseX + staggerOffset, stepX);
    for (let x = rowPhaseX - stepX; x < canvas.width; x += stepX) {
      if (x + item.width <= 0) {
        continue;
      }
      placements.push({ x, y });
      if (placements.length > MAX_TILE_COPIES) {
        throw new Error(
          `tile layout exceeds the maximum of ${MAX_TILE_COPIES} copies per layer.`
        );
      }
    }
  }

  return placements;
}
