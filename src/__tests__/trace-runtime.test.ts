import { ImageFormat } from '../index';
import { createInvisibleWatermarkRuntime } from '../trace-runtime';
import type {
  InvisibleWatermarkCodec,
  InvisibleWatermarkDecodedImage,
} from '../trace-runtime';

const KEY = '0123456789abcdef';

function createImage(
  width = 256,
  height = 176
): InvisibleWatermarkDecodedImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      data[index] = (x * 3 + y) % 256;
      data[index + 1] = (x + y * 2 + 37) % 256;
      data[index + 2] = (x * 2 + y * 3 + 91) % 256;
      data[index + 3] = 255;
    }
  }
  return { data, width, height };
}

describe('createInvisibleWatermarkRuntime', () => {
  it('embeds and detects through an injected codec without mutating its input', async () => {
    const source = createImage();
    const original = new Uint8ClampedArray(source.data);
    const decode = jest.fn(
      async (image: InvisibleWatermarkDecodedImage) => image
    );
    const encode = jest.fn(
      async (image: InvisibleWatermarkDecodedImage) => image
    );
    const runtime = createInvisibleWatermarkRuntime({
      codec: { decode, encode },
    });

    const output = await runtime.embedInvisible({
      image: { src: source },
      payload: 'asset-42',
      key: KEY,
      saveFormat: ImageFormat.png,
    });

    expect(source.data).toEqual(original);
    expect(output.data).not.toEqual(original);
    expect(decode).toHaveBeenCalledWith(source, { maxSize: 2048 });
    expect(encode).toHaveBeenCalledWith(output, {
      format: 'png',
      quality: 90,
      filename: undefined,
    });
    await expect(
      runtime.detectInvisible({ image: { src: output }, key: KEY })
    ).resolves.toEqual(
      expect.objectContaining({ detected: true, payload: 'asset-42' })
    );
  });

  it('snapshots options and forwards explicit output settings', async () => {
    let resolveDecode:
      | ((image: InvisibleWatermarkDecodedImage) => void)
      | null = null;
    const source = createImage();
    const codec: InvisibleWatermarkCodec<
      InvisibleWatermarkDecodedImage,
      InvisibleWatermarkDecodedImage
    > = {
      decode: jest.fn(
        () =>
          new Promise((resolve) => {
            resolveDecode = resolve;
          })
      ),
      encode: jest.fn(async (image) => image),
    };
    const runtime = createInvisibleWatermarkRuntime({ codec });
    const input = {
      image: { src: source },
      payload: 'before',
      key: KEY,
      quality: 81,
      filename: 'trace-output',
      maxSize: 512,
    };

    const pending = runtime.embedInvisible(input);
    input.payload = 'after';
    input.image.src = createImage();
    resolveDecode!(source);
    await pending;

    expect(codec.decode).toHaveBeenCalledWith(source, { maxSize: 512 });
    expect(codec.encode).toHaveBeenCalledWith(expect.anything(), {
      format: 'jpeg',
      quality: 81,
      filename: 'trace-output',
    });
  });

  it('rejects unsupported output and invalid codec contracts', async () => {
    const runtime = createInvisibleWatermarkRuntime({
      codec: {
        decode: async () => ({
          data: new Uint8Array(4),
          width: 256,
          height: 176,
        }),
        encode: async () => 'unused',
      },
    });

    await expect(
      runtime.embedInvisible({
        image: { src: 'image' },
        payload: 'asset-42',
        key: KEY,
        saveFormat: ImageFormat.base64 as never,
      })
    ).rejects.toThrow('does not support base64');
    await expect(
      runtime.detectInvisible({ image: { src: 'image' }, key: KEY })
    ).rejects.toThrow('byte length must exactly match');
    expect(() =>
      createInvisibleWatermarkRuntime({
        codec: { decode: async () => createImage(), encode: async () => '' },
        maxConcurrency: 0,
      })
    ).toThrow('maxConcurrency must be a positive finite integer');
  });

  it('caps batch concurrency, preserves order, and isolates item failures', async () => {
    let active = 0;
    let peak = 0;
    const runtime = createInvisibleWatermarkRuntime<string, string>({
      maxConcurrency: 2,
      codec: {
        async decode(source) {
          active += 1;
          peak = Math.max(peak, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active -= 1;
          if (source === 'broken') throw new Error('decode failed');
          return createImage();
        },
        async encode(_image, options) {
          return options.filename!;
        },
      },
    });

    const results = await runtime.embedInvisibleMany(
      ['first', 'broken', 'third'].map((src) => ({
        image: { src },
        payload: src,
        key: KEY,
        filename: src,
      })),
      { concurrency: 8 }
    );

    expect(peak).toBe(2);
    expect(results).toEqual([
      { status: 'fulfilled', value: 'first' },
      {
        status: 'rejected',
        reason: expect.objectContaining({ message: 'decode failed' }),
      },
      { status: 'fulfilled', value: 'third' },
    ]);
  });

  it('marks work that did not start after cancellation as aborted', async () => {
    const controller = new AbortController();
    const runtime = createInvisibleWatermarkRuntime<string, string>({
      maxConcurrency: 1,
      codec: {
        async decode() {
          controller.abort();
          return createImage();
        },
        async encode() {
          return 'done';
        },
      },
    });
    const results = await runtime.embedInvisibleMany(
      ['first', 'second'].map((src) => ({
        image: { src },
        payload: src,
        key: KEY,
      })),
      { concurrency: 2, signal: controller.signal }
    );

    expect(results[0]).toEqual({ status: 'fulfilled', value: 'done' });
    expect(results[1]).toEqual(expect.objectContaining({ status: 'aborted' }));
  });
});
