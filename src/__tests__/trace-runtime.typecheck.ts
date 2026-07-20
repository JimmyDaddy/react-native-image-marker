import {
  createInvisibleWatermarkRuntime,
  type InvisibleWatermarkCodec,
  type InvisibleWatermarkDecodedImage,
} from '../trace-runtime';

type Source = { bytes: Uint8Array };

const codec: InvisibleWatermarkCodec<Source, Uint8Array> = {
  async decode(): Promise<InvisibleWatermarkDecodedImage> {
    return {
      data: new Uint8ClampedArray(256 * 176 * 4),
      width: 256,
      height: 176,
    };
  },
  async encode(image, { format, quality }): Promise<Uint8Array> {
    format.toUpperCase();
    quality.toFixed(0);
    return new Uint8Array(image.data);
  },
};

const runtime = createInvisibleWatermarkRuntime({ codec, maxConcurrency: 2 });

export const serverOutput: Promise<Uint8Array> = runtime.embedInvisible({
  image: { src: { bytes: new Uint8Array() } },
  payload: 'asset-42',
  key: '0123456789abcdef',
  saveFormat: 'png',
});

export const serverDetection = runtime.detectInvisible({
  image: { src: { bytes: new Uint8Array() } },
  key: '0123456789abcdef',
  search: 'robust',
});

runtime.detectInvisible({
  image: { src: { bytes: new Uint8Array() } },
  key: '0123456789abcdef',
  // @ts-expect-error Worker execution belongs to the Web Marker API.
  worker: { scriptUrl: '/worker.js' },
});

runtime.embedInvisible({
  image: { src: { bytes: new Uint8Array() } },
  payload: 'asset-42',
  key: '0123456789abcdef',
  // @ts-expect-error Server output encoding belongs to the injected codec.
  saveFormat: 'base64',
});
