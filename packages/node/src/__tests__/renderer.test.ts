import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import { createNodeImageMarker } from '../renderer';

async function solid(
  width: number,
  height: number,
  background: { r: number; g: number; b: number; alpha?: number }
) {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { alpha: 1, ...background },
    },
  })
    .png()
    .toBuffer();
}

describe('@image-marker/node renderer', () => {
  const marker = createNodeImageMarker({ sharp, maxConcurrency: 4 });

  it('inspects and renders text/image Recipe layers into a bounded Buffer', async () => {
    const background = await solid(320, 180, { r: 18, g: 38, b: 68 });
    const logo = await solid(48, 32, { r: 240, g: 64, b: 48 });
    const phases: string[] = [];
    const result = await marker.render(
      {
        schemaVersion: 2,
        layers: [
          {
            id: 'title',
            type: 'text',
            text: 'Image Marker Node',
            position: { X: 18, Y: 18 },
            style: {
              color: '#FFFFFF',
              fontSize: 28,
              maxWidth: 220,
              lineHeight: 34,
              letterSpacing: 1,
              maxLines: 2,
              overflow: 'ellipsis',
              strokeStyle: { color: '#0F172A', width: 1 },
            },
          },
          {
            id: 'logo',
            type: 'image',
            src: logo,
            position: { position: 'bottomRight', edgeInset: 12 },
            scale: 0.75,
            blendMode: 'screen',
          },
        ],
        output: { saveFormat: 'png', maxSize: 160 },
      },
      { backgroundImage: { src: background } },
      { onProgress: ({ phase }) => phases.push(phase) }
    );

    expect(result).toEqual(
      expect.objectContaining({
        format: 'png',
        mimeType: 'image/png',
        width: 160,
        height: 90,
      })
    );
    expect(phases).toEqual([
      'queued',
      'decoding',
      'compositing',
      'encoding',
      'complete',
    ]);
    const info = await marker.inspect(result.data);
    expect(info).toEqual(
      expect.objectContaining({
        width: 160,
        height: 90,
        format: 'png',
        orientation: 1,
      })
    );
    const pixels = await sharp(result.data).raw().toBuffer();
    expect(
      pixels.some(
        (value, index) =>
          index % 4 !== 3 && Math.abs(value - [18, 38, 68][index % 4]!) > 20
      )
    ).toBe(true);
  });

  it('accepts file and Stream inputs and writes file and Stream outputs', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'image-marker-node-'));
    try {
      const sourcePath = join(directory, 'source.png');
      const outputPath = join(directory, 'result.webp');
      const background = await solid(96, 64, { r: 32, g: 64, b: 96 });
      await writeFile(sourcePath, background);
      const recipe = {
        schemaVersion: 2 as const,
        layers: [
          {
            id: 'label',
            type: 'text' as const,
            text: 'FILE',
            position: { position: 'center' as const },
            style: { fontSize: 18, color: '#FFFFFF' },
          },
        ],
        output: { saveFormat: 'webp' as const, quality: 80 },
      };

      const file = await marker.renderToFile(
        recipe,
        { backgroundImage: { src: sourcePath } },
        outputPath
      );
      expect(file.path).toBe(outputPath);
      expect((await readFile(outputPath)).length).toBeGreaterThan(0);

      const stream = await marker.renderToStream(recipe, {
        backgroundImage: { src: Readable.from(background) },
      });
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      expect(Buffer.concat(chunks).length).toBeGreaterThan(0);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('runs ordered concurrent batches with retries, progress, and cancellation', async () => {
    const background = await solid(64, 64, { r: 0, g: 0, b: 0 });
    const retry = jest.fn();
    const progress = jest.fn();
    const recipe = {
      schemaVersion: 2 as const,
      layers: [{ id: 'title', type: 'text' as const, text: 'Batch' }],
      output: { saveFormat: 'png' as const },
    };
    const results = await marker.renderMany(
      recipe,
      [
        { backgroundImage: { src: background } },
        { backgroundImage: { src: Buffer.from('invalid') } },
        { backgroundImage: { src: background } },
      ],
      {
        concurrency: 2,
        retries: 1,
        onRetry: retry,
        onBatchProgress: progress,
      }
    );
    expect(results.map((result) => result.status)).toEqual([
      'fulfilled',
      'rejected',
      'fulfilled',
    ]);
    expect(results[1]).toEqual(
      expect.objectContaining({ status: 'rejected', attempts: 2 })
    );
    expect(retry).toHaveBeenCalledTimes(1);
    expect(progress).toHaveBeenCalledTimes(3);

    const controller = new AbortController();
    controller.abort();
    const aborted = await marker.renderMany(
      recipe,
      [{ backgroundImage: { src: background } }],
      { signal: controller.signal }
    );
    expect(aborted[0]).toEqual(
      expect.objectContaining({ status: 'aborted', attempts: 0 })
    );
  });

  it('embeds and authenticates an invisible lossless locator', async () => {
    const background = await solid(80, 40, {
      r: 110,
      g: 130,
      b: 150,
    });
    const embedded = await marker.embedInvisible({
      image: background,
      payload: 'asset-42',
      key: '0123456789abcdef',
    });
    expect(embedded.format).toBe('png');
    await expect(
      marker.detectInvisible({
        image: embedded.data,
        key: '0123456789abcdef',
      })
    ).resolves.toEqual(
      expect.objectContaining({
        detected: true,
        payload: 'asset-42',
        algorithm: 'lsb-hmac-v1',
        confidence: 1,
      })
    );
    await expect(
      marker.detectInvisible({
        image: embedded.data,
        key: 'fedcba9876543210',
      })
    ).resolves.toEqual(
      expect.objectContaining({ detected: false, confidence: 0 })
    );
  });
});
