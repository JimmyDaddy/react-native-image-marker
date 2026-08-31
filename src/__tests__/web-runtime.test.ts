import {
  createWebMarker,
  type WebMarkerExecutionRequest,
  type WebMarkerExecutionTask,
} from '../web';
import type { MarkerResult } from '../result';
import { createWebCanvas, getWebImageInfo, loadWebImage } from '../web/browser';

function createPng(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function markerResult(
  taskId: string,
  operation: MarkerResult['operation'] = 'markText'
): MarkerResult {
  return {
    jobId: taskId,
    operation,
    uri: 'data:image/png;base64,result',
    output: 'data-url',
    format: 'png',
    mimeType: 'image/png',
    durationMs: 1,
    metadata: { orientation: 'normalized', policy: 'strip' },
  };
}

function deferred<Result>() {
  let resolve: (value: Result) => void;
  let reject: (reason: unknown) => void;
  const promise = new Promise<Result>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve: resolve!, reject: reject! };
}

const textOptions = {
  backgroundImage: { src: 'file:///background.png' },
  watermarkTexts: [{ text: 'Confidential' }],
};

describe('Web Marker runtime instances', () => {
  it('waits for a real host termination acknowledgement and task settlement', async () => {
    const result = deferred<MarkerResult>();
    const termination = deferred<void>();
    const terminate = jest.fn(() => termination.promise);
    const dispose = jest.fn();
    const starts: WebMarkerExecutionRequest[] = [];
    const marker = createWebMarker({
      execution: {
        start<Result>(
          request: WebMarkerExecutionRequest
        ): WebMarkerExecutionTask<Result> {
          starts.push(request);
          return {
            result: result.promise as Promise<Result>,
            terminate,
            dispose,
          };
        },
      },
    });

    const pending = marker.markText(textOptions);
    expect(starts).toHaveLength(1);
    expect(starts[0]).toEqual(
      expect.objectContaining({
        operation: 'markText',
        resultKind: 'marker-result',
        options: textOptions,
        signal: expect.any(AbortSignal),
      })
    );
    expect(marker.capabilities).toEqual(
      expect.objectContaining({
        execution: {
          mode: 'host-adapter',
          supportsTerminationAcknowledgement: true,
        },
        visibleRendering: expect.objectContaining({
          cancellation: 'host-termination-required',
        }),
      })
    );

    let cancellationSettled = false;
    const cancellation = marker.cancel().then(() => {
      cancellationSettled = true;
    });
    await Promise.resolve();
    expect(terminate).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: starts[0]?.taskId,
        reason: 'cancel',
      })
    );
    await Promise.resolve();
    expect(cancellationSettled).toBe(false);
    termination.resolve();
    await Promise.resolve();
    expect(cancellationSettled).toBe(false);

    result.resolve(markerResult(starts[0]?.taskId ?? 'missing'));
    await cancellation;
    await expect(pending).rejects.toEqual(
      expect.objectContaining({ code: 'ABORTED', operation: 'markText' })
    );
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('makes repeated cancellation idempotent and keeps late results scoped to their instance', async () => {
    const first = deferred<MarkerResult>();
    const second = deferred<MarkerResult>();
    const firstTerminate = jest.fn();
    const secondTerminate = jest.fn();
    const firstMarker = createWebMarker({
      execution: {
        start<Result>(): WebMarkerExecutionTask<Result> {
          return {
            result: first.promise as Promise<Result>,
            terminate: firstTerminate,
          };
        },
      },
    });
    const secondMarker = createWebMarker({
      execution: {
        start<Result>(): WebMarkerExecutionTask<Result> {
          return {
            result: second.promise as Promise<Result>,
            terminate: secondTerminate,
          };
        },
      },
    });

    const firstPending = firstMarker.markText(textOptions);
    const secondPending = secondMarker.markText(textOptions);
    const firstCancellation = Promise.all([
      firstMarker.cancel(),
      firstMarker.cancel(),
    ]);
    await Promise.resolve();
    expect(firstTerminate).toHaveBeenCalledTimes(1);
    expect(secondTerminate).not.toHaveBeenCalled();

    second.resolve(markerResult('second'));
    await expect(secondPending).resolves.toEqual(markerResult('second'));
    first.resolve(markerResult('first'));
    await firstCancellation;
    await expect(firstPending).rejects.toEqual(
      expect.objectContaining({ code: 'ABORTED', operation: 'markText' })
    );
  });

  it('disposes active host tasks and rejects future work', async () => {
    const result = deferred<MarkerResult>();
    const terminate = jest.fn();
    const dispose = jest.fn();
    const marker = createWebMarker({
      execution: {
        start<Result>(): WebMarkerExecutionTask<Result> {
          return {
            result: result.promise as Promise<Result>,
            terminate,
            dispose,
          };
        },
      },
    });

    const pending = marker.markText(textOptions);
    const disposing = marker.dispose();
    await Promise.resolve();
    expect(marker.disposed).toBe(true);
    expect(terminate).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'dispose' })
    );
    await expect(marker.markText(textOptions)).rejects.toEqual(
      expect.objectContaining({ code: 'ABORTED' })
    );

    result.resolve(markerResult('disposed'));
    await disposing;
    expect(dispose).toHaveBeenCalledTimes(1);
    await expect(pending).rejects.toEqual(
      expect.objectContaining({ code: 'ABORTED' })
    );
  });

  it('does not call host termination after a completed task', async () => {
    const terminate = jest.fn();
    const marker = createWebMarker({
      execution: {
        start<Result>(request): WebMarkerExecutionTask<Result> {
          return {
            result: Promise.resolve(markerResult(request.taskId) as Result),
            terminate,
          };
        },
      },
    });

    await expect(marker.markText(textOptions)).resolves.toEqual(
      expect.objectContaining({ operation: 'markText' })
    );
    await marker.cancel();
    expect(terminate).not.toHaveBeenCalled();
  });

  it('does not start a host task when its caller signal was already cancelled', async () => {
    const start = jest.fn();
    const marker = createWebMarker({
      execution: {
        start<Result>(request): WebMarkerExecutionTask<Result> {
          start(request);
          return {
            result: Promise.resolve(markerResult(request.taskId) as Result),
          };
        },
      },
    });
    const controller = new AbortController();
    controller.abort();

    await expect(
      marker.markText(textOptions, { signal: controller.signal })
    ).rejects.toEqual(expect.objectContaining({ code: 'ABORTED' }));
    expect(start).not.toHaveBeenCalled();
  });

  it('forwards an active caller abort to a host cancel task boundary', async () => {
    const result = deferred<MarkerResult>();
    const cancel = jest.fn();
    const marker = createWebMarker({
      execution: {
        start<Result>(): WebMarkerExecutionTask<Result> {
          return { result: result.promise as Promise<Result>, cancel };
        },
      },
    });
    const controller = new AbortController();
    const pending = marker.markText(textOptions, { signal: controller.signal });

    controller.abort();
    await Promise.resolve();
    expect(cancel).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'signal' })
    );
    result.resolve(markerResult('signal-cancelled'));
    await expect(pending).rejects.toEqual(
      expect.objectContaining({ code: 'ABORTED', operation: 'markText' })
    );
  });

  it('enforces timeouts at the host boundary before completing the task', async () => {
    jest.useFakeTimers();
    try {
      const result = deferred<MarkerResult>();
      const terminate = jest.fn();
      const marker = createWebMarker({
        execution: {
          start<Result>(): WebMarkerExecutionTask<Result> {
            return { result: result.promise as Promise<Result>, terminate };
          },
        },
      });
      const pending = marker.markText(textOptions, { timeoutMs: 20 });

      jest.advanceTimersByTime(20);
      await Promise.resolve();
      expect(terminate).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'timeout' })
      );
      result.resolve(markerResult('timed-out'));
      await expect(pending).rejects.toEqual(
        expect.objectContaining({ code: 'TIMEOUT', operation: 'markText' })
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects invalid runtime controls before dispatching a host task', async () => {
    const start = jest.fn();
    const marker = createWebMarker({
      execution: {
        start<Result>(): WebMarkerExecutionTask<Result> {
          start();
          return {
            result: Promise.resolve(markerResult('unexpected') as Result),
          };
        },
      },
    });

    await expect(
      marker.markText(textOptions, { timeoutMs: 0 })
    ).rejects.toEqual(expect.objectContaining({ code: 'INVALID_OPTIONS' }));
    expect(start).not.toHaveBeenCalled();
  });

  it('uses injected Blob bytes and decodes data URLs without fetching them', async () => {
    const bytes = createPng(321, 123);
    const readBlobBytes = jest.fn(async () => bytes.buffer);
    const marker = createWebMarker({ resources: { readBlobBytes } });
    await expect(
      marker.getImageInfo(new Blob(['ignored'], { type: 'image/png' }))
    ).resolves.toEqual(
      expect.objectContaining({ width: 321, height: 123, format: 'png' })
    );
    expect(readBlobBytes).toHaveBeenCalledTimes(1);

    const dataUrl = `data:image/png;base64,${btoa(
      String.fromCharCode(...bytes)
    )}`;
    const originalFetch = globalThis.fetch;
    const fetch = jest.fn();
    Object.assign(globalThis, { fetch });
    try {
      await expect(getWebImageInfo(dataUrl)).resolves.toEqual(
        expect.objectContaining({ width: 321, height: 123, format: 'png' })
      );
      const percentEncoded = Array.from(
        bytes,
        (byte) => `%${byte.toString(16).padStart(2, '0')}`
      ).join('');
      await expect(
        getWebImageInfo(`data:image/png,${percentEncoded}`)
      ).resolves.toEqual(
        expect.objectContaining({ width: 321, height: 123, format: 'png' })
      );
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      Object.assign(globalThis, { fetch: originalFetch });
    }
  });

  it('decodes percent-encoded Unicode data URLs without a TextEncoder global', async () => {
    const bytes = createPng(37, 19);
    const percentEncoded = Array.from(
      bytes,
      (byte) => `%${byte.toString(16).padStart(2, '0')}`
    ).join('');
    const descriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'TextEncoder'
    );
    Object.defineProperty(globalThis, 'TextEncoder', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    try {
      await expect(
        getWebImageInfo(`data:image/png,${percentEncoded}☃`)
      ).resolves.toEqual(
        expect.objectContaining({ width: 37, height: 19, format: 'png' })
      );
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, 'TextEncoder', descriptor);
      } else {
        delete (globalThis as { TextEncoder?: unknown }).TextEncoder;
      }
    }
  });

  it('waits for an in-flight local byte read before cancellation resolves', async () => {
    const bytes = createPng(64, 32);
    const read = deferred<ArrayBuffer>();
    const marker = createWebMarker({
      resources: { readBlobBytes: () => read.promise },
    });
    const pending = marker.getImageInfo(
      new Blob(['delayed'], { type: 'image/png' })
    );
    let cancellationSettled = false;
    const cancellation = marker.cancel().then(() => {
      cancellationSettled = true;
    });

    await Promise.resolve();
    expect(cancellationSettled).toBe(false);
    read.resolve(bytes.buffer);
    await cancellation;
    await expect(pending).rejects.toEqual(
      expect.objectContaining({ code: 'ABORTED' })
    );
  });

  it('cleans an object URL when an instance-owned image load is aborted', async () => {
    let source = '';
    const image = {
      get src() {
        return source;
      },
      set src(value: string) {
        source = value;
      },
      onload: null as (() => void) | null,
      onerror: null as ((event?: unknown) => void) | null,
      naturalWidth: 0,
      naturalHeight: 0,
    };
    const revokeObjectURL = jest.fn();
    const controller = new AbortController();
    const loading = loadWebImage(
      new Blob(['image'], { type: 'image/png' }),
      {
        createImage: () => image,
        createObjectURL: () => 'blob:instance-owned',
        revokeObjectURL,
      },
      controller.signal
    );
    controller.abort();
    await expect(loading).rejects.toMatchObject({ name: 'AbortError' });
    expect(source).toBe('');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:instance-owned');
  });

  it('releases Blob object URLs when an injected image factory fails', async () => {
    const revokeObjectURL = jest.fn(() => {
      throw new Error('cleanup failure');
    });
    await expect(
      loadWebImage(new Blob(['image'], { type: 'image/png' }), {
        createObjectURL: () => 'blob:failed-factory',
        revokeObjectURL,
        createImage: () => {
          throw new Error('image factory failure');
        },
      })
    ).rejects.toThrow('image factory failure');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:failed-factory');
  });

  it('rejects malformed injected image and canvas resources at the boundary', async () => {
    await expect(
      loadWebImage('/image.png', { createImage: () => 'not-an-image' })
    ).rejects.toThrow('invalid image');
    await expect(
      loadWebImage('/image.png', { createImage: () => ({}) })
    ).rejects.toThrow('invalid image');

    expect(() =>
      createWebCanvas(1, 1, { createCanvas: () => 'not-a-canvas' })
    ).toThrow('requires Canvas 2D');
    expect(() => createWebCanvas(1, 1, { createCanvas: () => ({}) })).toThrow(
      'invalid canvas'
    );
    expect(() =>
      createWebCanvas(1, 1, {
        createCanvas: () => ({ getContext: () => null }),
      })
    ).toThrow('Canvas 2D is unavailable');
    expect(() =>
      createWebCanvas(1, 1, {
        createCanvas: () => {
          throw new Error('canvas factory failure');
        },
      })
    ).toThrow('canvas factory failure');
  });

  it('keeps injected image resource ownership after a cached image loads', async () => {
    let source = '';
    const image = {
      get src() {
        return source;
      },
      set src(value: string) {
        source = value;
      },
      onload: null as (() => void) | null,
      onerror: null as ((event?: unknown) => void) | null,
      complete: true,
      naturalWidth: 20,
      naturalHeight: 10,
      decode: jest.fn(async () => {
        throw new Error('cached decode unavailable');
      }),
    };
    const revokeObjectURL = jest.fn();
    const loaded = await loadWebImage(
      new Blob(['image'], { type: 'image/png' }),
      {
        createImage: () => image,
        createObjectURL: () => 'blob:cached-image',
        revokeObjectURL,
      }
    );

    expect(loaded).toEqual(
      expect.objectContaining({ image, width: 20, height: 10 })
    );
    expect(source).toBe('blob:cached-image');
    expect(image.decode).toHaveBeenCalledTimes(1);
    loaded.cleanup();
    loaded.cleanup();
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:cached-image');
  });
});
