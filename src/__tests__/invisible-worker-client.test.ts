import { detectInvisibleWatermarkInWorker } from '../web/invisible-worker-client';

class FakeWorker {
  static instances: FakeWorker[] = [];

  readonly url: string | URL;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  posted: Array<{ message: any; transfer: Transferable[] }> = [];
  terminated = false;

  constructor(url: string | URL) {
    this.url = url;
    FakeWorker.instances.push(this);
  }

  postMessage(message: unknown, transfer: Transferable[] = []): void {
    this.posted.push({ message, transfer });
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(message: unknown): void {
    this.onmessage?.({ data: message } as MessageEvent<unknown>);
  }

  fail(): void {
    this.onerror?.(new Event('error'));
  }
}

const pixels = {
  data: new Uint8ClampedArray(256 * 176 * 4),
  width: 256,
  height: 176,
};

const WorkerClass = FakeWorker as unknown as typeof Worker;

describe('invisible watermark Worker client', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
  });

  it('waits for protocol readiness, transfers a copy, and cleans up', async () => {
    const phases: string[] = [];
    const detectionWithExtraFields = {
      key: '0123456789abcdef',
      strength: 'robust' as const,
      search: 'fast' as const,
      image: { src: 'must-not-cross-the-worker-boundary' },
      worker: { signal: new AbortController().signal },
    };
    const pending = detectInvisibleWatermarkInWorker(
      pixels,
      detectionWithExtraFields,
      {
        scriptUrl: '/worker/invisible-watermark.js',
        onProgress: ({ phase }) => phases.push(phase),
      },
      WorkerClass
    );
    const worker = FakeWorker.instances[0]!;

    expect(phases).toEqual(['queued']);
    worker.emit({ protocol: 1, type: 'ready' });
    expect(phases).toEqual(['queued', 'detecting']);
    expect(worker.posted).toHaveLength(1);
    const request = worker.posted[0]!.message;
    expect(request).toEqual(
      expect.objectContaining({
        protocol: 1,
        type: 'detect',
        width: 256,
        height: 176,
      })
    );
    expect(request.options).toEqual({
      key: '0123456789abcdef',
      strength: 'robust',
      search: 'fast',
    });
    expect(request.pixels).not.toBe(pixels.data.buffer);
    expect(worker.posted[0]!.transfer).toEqual([request.pixels]);

    const result = {
      detected: true,
      payload: 'asset-42',
      confidence: 0.98,
      algorithm: 'dct-qim-v1' as const,
    };
    worker.emit({
      protocol: 1,
      id: request.id,
      type: 'result',
      result,
    });

    await expect(pending).resolves.toEqual(result);
    expect(phases).toEqual(['queued', 'detecting', 'complete']);
    expect(worker.terminated).toBe(true);
    expect(worker.onmessage).toBeNull();
    expect(worker.onerror).toBeNull();
  });

  it('fails explicitly on protocol mismatch and script errors', async () => {
    const mismatch = detectInvisibleWatermarkInWorker(
      pixels,
      { key: '0123456789abcdef' },
      { scriptUrl: '/old-worker.js' },
      WorkerClass
    );
    const oldWorker = FakeWorker.instances[0]!;
    oldWorker.emit({ protocol: 0, type: 'ready' });
    await expect(mismatch).rejects.toThrow('protocol mismatch');
    expect(oldWorker.terminated).toBe(true);

    const scriptFailure = detectInvisibleWatermarkInWorker(
      pixels,
      { key: '0123456789abcdef' },
      { scriptUrl: '/missing-worker.js' },
      WorkerClass
    );
    const failedWorker = FakeWorker.instances[1]!;
    failedWorker.fail();
    await expect(scriptFailure).rejects.toThrow('failed to load or run');
    expect(failedWorker.terminated).toBe(true);
  });

  it('rejects malformed optional detection metrics', async () => {
    const pending = detectInvisibleWatermarkInWorker(
      pixels,
      { key: '0123456789abcdef' },
      { scriptUrl: '/worker.js' },
      WorkerClass
    );
    const worker = FakeWorker.instances[0]!;
    worker.emit({ protocol: 1, type: 'ready' });
    worker.emit({
      protocol: 1,
      id: worker.posted[0]!.message.id,
      type: 'result',
      result: {
        detected: true,
        payload: 'asset-42',
        confidence: 0.9,
        bitErrorRate: 2,
        algorithm: 'dct-qim-v1',
      },
    });

    await expect(pending).rejects.toThrow('returned invalid data');
    expect(worker.terminated).toBe(true);
  });

  it('cleans up if the detection request cannot be cloned', async () => {
    const pending = detectInvisibleWatermarkInWorker(
      pixels,
      { key: '0123456789abcdef' },
      { scriptUrl: '/worker.js' },
      WorkerClass
    );
    const worker = FakeWorker.instances[0]!;
    worker.postMessage = () => {
      throw new DOMException('could not clone', 'DataCloneError');
    };
    worker.emit({ protocol: 1, type: 'ready' });

    await expect(pending).rejects.toMatchObject({ name: 'DataCloneError' });
    expect(worker.terminated).toBe(true);
  });

  it('does not create a Worker when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      detectInvisibleWatermarkInWorker(
        pixels,
        { key: '0123456789abcdef' },
        { scriptUrl: '/worker.js', signal: controller.signal },
        WorkerClass
      )
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(FakeWorker.instances).toHaveLength(0);
  });

  it('terminates an active Worker when aborted', async () => {
    const controller = new AbortController();
    const pending = detectInvisibleWatermarkInWorker(
      pixels,
      { key: '0123456789abcdef' },
      { scriptUrl: '/worker.js', signal: controller.signal },
      WorkerClass
    );
    const worker = FakeWorker.instances[0]!;
    worker.emit({ protocol: 1, type: 'ready' });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker.terminated).toBe(true);
  });

  it('ignores progress observer failures', async () => {
    const pending = detectInvisibleWatermarkInWorker(
      pixels,
      { key: '0123456789abcdef' },
      {
        scriptUrl: '/worker.js',
        onProgress: () => {
          throw new Error('observer failed');
        },
      },
      WorkerClass
    );
    const worker = FakeWorker.instances[0]!;
    worker.emit({ protocol: 1, type: 'ready' });
    worker.emit({
      protocol: 1,
      id: worker.posted[0]!.message.id,
      type: 'result',
      result: {
        detected: false,
        confidence: 0,
        algorithm: 'dct-qim-v1',
      },
    });

    await expect(pending).resolves.toEqual(
      expect.objectContaining({ detected: false })
    );
  });
});
