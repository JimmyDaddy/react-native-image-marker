import { ImageFormat, type MarkOptions } from '../index';
import {
  createWatermarkRecipe,
  type WatermarkBatchProgress,
  type WatermarkRecipeOptions,
} from '../recipe';

const textRecipe: WatermarkRecipeOptions = {
  watermarks: [{ type: 'text', text: 'CONFIDENTIAL' }],
  saveFormat: ImageFormat.jpg,
};

describe('watermark recipe batches', () => {
  it('runs serially by default and respects the Web concurrency cap', async () => {
    let active = 0;
    let maximumActive = 0;
    const renderer = async (options: MarkOptions) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return String(options.backgroundImage.src);
    };
    const recipe = createWatermarkRecipe(textRecipe, renderer, 4);
    const inputs = Array.from({ length: 10 }, (_, index) => ({
      backgroundImage: { src: `image-${index}` },
    }));

    const serial = await recipe.applyMany(inputs);
    expect(maximumActive).toBe(1);
    expect(serial).toHaveLength(10);
    expect(serial.every((result) => result.status === 'fulfilled')).toBe(true);

    maximumActive = 0;
    const concurrent = await recipe.applyMany(inputs.slice(0, 8), {
      concurrency: 20,
    });
    expect(maximumActive).toBe(4);
    expect(concurrent).toHaveLength(8);
  });

  it('caps native recipes at one active render', async () => {
    let active = 0;
    let maximumActive = 0;
    const recipe = createWatermarkRecipe(
      textRecipe,
      async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active -= 1;
        return 'done';
      },
      1
    );

    await recipe.applyMany(
      [1, 2, 3].map((value) => ({ backgroundImage: { src: value } })),
      { concurrency: 3 }
    );
    expect(maximumActive).toBe(1);
  });

  it('keeps input order, isolates failures, and reports progress counts', async () => {
    const progress: Array<WatermarkBatchProgress<string>> = [];
    const recipe = createWatermarkRecipe(
      textRecipe,
      async (options) => {
        const source = String(options.backgroundImage.src);
        await new Promise((resolve) =>
          setTimeout(resolve, source === 'slow' ? 12 : 1)
        );
        if (source === 'broken') {
          throw new Error('decode failed');
        }
        return `done:${source}`;
      },
      4
    );

    const results = await recipe.applyMany(
      ['slow', 'broken', 'fast'].map((src) => ({ backgroundImage: { src } })),
      { concurrency: 3, onProgress: (event) => progress.push(event) }
    );

    expect(results[0]).toEqual({ status: 'fulfilled', value: 'done:slow' });
    expect(results[1]).toEqual({
      status: 'rejected',
      reason: expect.objectContaining({ message: 'decode failed' }),
    });
    expect(results[2]).toEqual({ status: 'fulfilled', value: 'done:fast' });
    expect(progress.map((event) => event.index).sort()).toEqual([0, 1, 2]);
    expect(progress.at(-1)).toEqual(
      expect.objectContaining({
        total: 3,
        settled: 3,
        succeeded: 2,
        failed: 1,
        aborted: 0,
      })
    );
  });

  it('stops dispatching after abort while allowing running work to finish', async () => {
    const controller = new AbortController();
    const releases: Array<() => void> = [];
    const started: string[] = [];
    const progress: Array<WatermarkBatchProgress<string>> = [];
    const recipe = createWatermarkRecipe(
      textRecipe,
      async (options) => {
        started.push(String(options.backgroundImage.src));
        await new Promise<void>((resolve) => releases.push(resolve));
        return String(options.backgroundImage.src);
      },
      4
    );

    const batch = recipe.applyMany(
      ['one', 'two', 'three', 'four'].map((src) => ({
        backgroundImage: { src },
      })),
      {
        concurrency: 2,
        signal: controller.signal,
        onProgress: (event) => progress.push(event),
      }
    );
    await Promise.resolve();
    expect(started).toEqual(['one', 'two']);
    controller.abort();
    releases.forEach((release) => release());

    const results = await batch;
    expect(results.map((result) => result.status)).toEqual([
      'fulfilled',
      'fulfilled',
      'aborted',
      'aborted',
    ]);
    expect(progress.at(-1)).toEqual(
      expect.objectContaining({
        settled: 4,
        succeeded: 2,
        failed: 0,
        aborted: 2,
      })
    );
  });

  it('returns all items as aborted without dispatch when already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    const renderer = jest.fn<Promise<string>, [MarkOptions]>(
      async () => 'done'
    );
    const recipe = createWatermarkRecipe(textRecipe, renderer, 4);

    const results = await recipe.applyMany(
      [1, 2, 3].map((src) => ({ backgroundImage: { src } })),
      { concurrency: 3, signal: controller.signal }
    );

    expect(results.map((result) => result.status)).toEqual([
      'aborted',
      'aborted',
      'aborted',
    ]);
    expect(renderer).not.toHaveBeenCalled();
  });

  it('snapshots queued inputs before serial dispatch', async () => {
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const recipe = createWatermarkRecipe(
      textRecipe,
      async (options) => {
        const source = String(options.backgroundImage.src);
        if (source === 'first') await firstGate;
        return source;
      },
      4
    );
    const inputs = [
      { backgroundImage: { src: 'first' } },
      { backgroundImage: { src: 'second-before' } },
    ];

    const batch = recipe.applyMany(inputs);
    inputs[1]!.backgroundImage.src = 'second-after';
    releaseFirst?.();

    await expect(batch).resolves.toEqual([
      { status: 'fulfilled', value: 'first' },
      { status: 'fulfilled', value: 'second-before' },
    ]);
  });

  it('preflights canonical filename collisions before rendering', async () => {
    const renderer = jest.fn<Promise<string>, [MarkOptions]>(
      async () => 'done'
    );
    const recipe = createWatermarkRecipe(textRecipe, renderer, 4);

    await expect(
      recipe.applyMany([
        { backgroundImage: { src: 'one' }, filename: 'photo' },
        { backgroundImage: { src: 'two' }, filename: 'PHOTO.png' },
      ])
    ).rejects.toThrow(
      'Duplicate output filename "photo.jpg" for inputs 0 and 1.'
    );
    expect(renderer).not.toHaveBeenCalled();
  });

  it('validates concurrency and isolates progress callback errors', async () => {
    const recipe = createWatermarkRecipe(textRecipe, async () => 'done', 4);

    await expect(
      recipe.applyMany([{ backgroundImage: { src: 'one' } }], {
        concurrency: 1.5,
      })
    ).rejects.toThrow('concurrency must be a positive finite integer.');
    await expect(
      recipe.applyMany([{ backgroundImage: { src: 'one' } }], {
        onProgress() {
          throw new Error('observer failed');
        },
      })
    ).resolves.toEqual([{ status: 'fulfilled', value: 'done' }]);
  });
});
