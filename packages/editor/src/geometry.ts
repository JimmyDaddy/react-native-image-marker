import type {
  EditorPoint,
  EditorSafeArea,
  EditorSnapContext,
  EditorSnapGuide,
} from './types';

const DEFAULT_SNAP_THRESHOLD = 6;

interface SnapCandidate {
  value: number;
  guide: EditorSnapGuide;
}

function closest(
  value: number,
  candidates: readonly SnapCandidate[],
  threshold: number
): SnapCandidate | undefined {
  return candidates
    .map((candidate) => ({
      ...candidate,
      distance: Math.abs(candidate.value - value),
    }))
    .filter((candidate) => candidate.distance <= threshold)
    .sort((left, right) => left.distance - right.distance)[0];
}

export function normalizeSafeArea(
  safeArea: Partial<EditorSafeArea> = {}
): EditorSafeArea {
  return {
    top: Math.max(0, safeArea.top ?? 0),
    right: Math.max(0, safeArea.right ?? 0),
    bottom: Math.max(0, safeArea.bottom ?? 0),
    left: Math.max(0, safeArea.left ?? 0),
  };
}

export function snapLayerPosition(
  point: EditorPoint,
  context: EditorSnapContext
): { point: EditorPoint; guides: EditorSnapGuide[] } {
  const safe = normalizeSafeArea(context.safeArea);
  const threshold = context.threshold ?? DEFAULT_SNAP_THRESHOLD;
  const canvasCenterX = context.canvas.width / 2;
  const canvasCenterY = context.canvas.height / 2;
  const layerCenterX = context.layer.width / 2;
  const layerCenterY = context.layer.height / 2;
  const right = context.canvas.width - safe.right - context.layer.width;
  const bottom = context.canvas.height - safe.bottom - context.layer.height;

  const xCandidates: SnapCandidate[] = [
    {
      value: 0,
      guide: { axis: 'x', position: 0, kind: 'edge' },
    },
    {
      value: safe.left,
      guide: { axis: 'x', position: safe.left, kind: 'safe-area' },
    },
    {
      value: canvasCenterX - layerCenterX,
      guide: { axis: 'x', position: canvasCenterX, kind: 'center' },
    },
    {
      value: right,
      guide: {
        axis: 'x',
        position: context.canvas.width - safe.right,
        kind: 'safe-area',
      },
    },
    {
      value: context.canvas.width - context.layer.width,
      guide: {
        axis: 'x',
        position: context.canvas.width,
        kind: 'edge',
      },
    },
  ];
  const yCandidates: SnapCandidate[] = [
    {
      value: 0,
      guide: { axis: 'y', position: 0, kind: 'edge' },
    },
    {
      value: safe.top,
      guide: { axis: 'y', position: safe.top, kind: 'safe-area' },
    },
    {
      value: canvasCenterY - layerCenterY,
      guide: { axis: 'y', position: canvasCenterY, kind: 'center' },
    },
    {
      value: bottom,
      guide: {
        axis: 'y',
        position: context.canvas.height - safe.bottom,
        kind: 'safe-area',
      },
    },
    {
      value: context.canvas.height - context.layer.height,
      guide: {
        axis: 'y',
        position: context.canvas.height,
        kind: 'edge',
      },
    },
  ];

  const snappedX = closest(point.x, xCandidates, threshold);
  const snappedY = closest(point.y, yCandidates, threshold);
  return {
    point: {
      x: snappedX?.value ?? point.x,
      y: snappedY?.value ?? point.y,
    },
    guides: [snappedX?.guide, snappedY?.guide].filter(
      (guide): guide is EditorSnapGuide => Boolean(guide)
    ),
  };
}

export function distance(first: EditorPoint, second: EditorPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function angle(first: EditorPoint, second: EditorPoint): number {
  return (Math.atan2(second.y - first.y, second.x - first.x) * 180) / Math.PI;
}
