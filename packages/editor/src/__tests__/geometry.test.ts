import { normalizeSafeArea, snapLayerPosition } from '../geometry';

describe('editor geometry', () => {
  it('normalizes safe areas and snaps to canvas centers', () => {
    expect(normalizeSafeArea({ top: -2, left: 12 })).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 12,
    });
    expect(
      snapLayerPosition(
        { x: 149, y: 99 },
        {
          canvas: { width: 400, height: 300 },
          layer: { width: 100, height: 100 },
          threshold: 3,
        }
      )
    ).toEqual({
      point: { x: 150, y: 100 },
      guides: [
        { axis: 'x', position: 200, kind: 'center' },
        { axis: 'y', position: 150, kind: 'center' },
      ],
    });
  });

  it('snaps to safe-area edges without moving distant coordinates', () => {
    const result = snapLayerPosition(
      { x: 18, y: 81 },
      {
        canvas: { width: 320, height: 240 },
        layer: { width: 80, height: 40 },
        safeArea: { top: 20, right: 16, bottom: 24, left: 16 },
        threshold: 3,
      }
    );
    expect(result.point).toEqual({ x: 16, y: 81 });
    expect(result.guides).toEqual([
      { axis: 'x', position: 16, kind: 'safe-area' },
    ]);
  });
});
