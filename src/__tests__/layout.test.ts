import {
  MAX_TILE_COPIES,
  resolveLayoutValue,
  resolveTilePlacements,
} from '../layout';

describe('tile layout', () => {
  it('resolves pixel and percentage values', () => {
    expect(resolveLayoutValue(12, 200, 'value')).toBe(12);
    expect(resolveLayoutValue('12.5%', 200, 'value')).toBe(25);
    expect(resolveLayoutValue(' -4 ', 200, 'value')).toBe(-4);
  });

  it('covers the canvas with stable row-major placements', () => {
    const placements = resolveTilePlacements(
      { type: 'tile', gapX: 10, gapY: 10 },
      { width: 100, height: 80 },
      { width: 20, height: 10 }
    );

    expect(placements).toHaveLength(16);
    expect(placements.slice(0, 4)).toEqual([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 60, y: 0 },
      { x: 90, y: 0 },
    ]);
    expect(placements.at(-1)).toEqual({ x: 90, y: 60 });
  });

  it('normalizes offsets and staggers every other row', () => {
    const placements = resolveTilePlacements(
      {
        type: 'tile',
        gapX: 20,
        gapY: 10,
        offsetX: '10%',
        offsetY: -5,
        stagger: true,
      },
      { width: 100, height: 60 },
      { width: 20, height: 10 }
    );

    expect(placements.slice(0, 3)).toEqual([
      { x: -10, y: -5 },
      { x: 30, y: -5 },
      { x: 70, y: -5 },
    ]);
    expect(placements.filter((point) => point.y === 15).slice(0, 3)).toEqual([
      { x: 10, y: 15 },
      { x: 50, y: 15 },
      { x: 90, y: 15 },
    ]);
  });

  it('rejects invalid gaps and excessive copy counts', () => {
    expect(() =>
      resolveTilePlacements(
        { type: 'tile', gapX: -1 },
        { width: 100, height: 100 },
        { width: 10, height: 10 }
      )
    ).toThrow('layout gaps must be non-negative.');

    expect(() =>
      resolveTilePlacements(
        { type: 'tile' },
        { width: 100, height: 100 },
        { width: 1, height: 1 }
      )
    ).toThrow(
      `tile layout exceeds the maximum of ${MAX_TILE_COPIES} copies per layer.`
    );
  });
});
