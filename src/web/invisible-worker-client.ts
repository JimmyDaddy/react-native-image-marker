import type {
  DetectInvisibleWatermarkOptions,
  InvisibleWatermarkDetectionResult,
  InvisibleWatermarkPixelBuffer,
  InvisibleWatermarkWorkerOptions,
} from '../invisible-watermark';
import { INVISIBLE_WATERMARK_ALGORITHM } from '../invisible-watermark';

const WORKER_PROTOCOL = 1 as const;
let requestSequence = 0;

type WorkerConstructor = new (scriptURL: string | URL) => Worker;

function abortError(): Error {
  const error = new Error('Invisible watermark worker detection was aborted.');
  error.name = 'AbortError';
  return error;
}

function report(
  options: InvisibleWatermarkWorkerOptions,
  phase: 'queued' | 'detecting' | 'complete'
): void {
  try {
    options.onProgress?.({ phase });
  } catch {
    // Observers cannot change detection results or Worker cleanup.
  }
}

function isDetectionResult(
  value: unknown
): value is InvisibleWatermarkDetectionResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<InvisibleWatermarkDetectionResult>;
  const validPayload =
    result.payload === undefined || typeof result.payload === 'string';
  const validBitErrorRate =
    result.bitErrorRate === undefined ||
    (typeof result.bitErrorRate === 'number' &&
      Number.isFinite(result.bitErrorRate) &&
      result.bitErrorRate >= 0 &&
      result.bitErrorRate <= 1);
  const validScale =
    result.scale === undefined ||
    (typeof result.scale === 'number' &&
      Number.isFinite(result.scale) &&
      result.scale > 0);
  return (
    typeof result.detected === 'boolean' &&
    typeof result.confidence === 'number' &&
    Number.isFinite(result.confidence) &&
    result.confidence >= 0 &&
    result.confidence <= 1 &&
    result.algorithm === INVISIBLE_WATERMARK_ALGORITHM &&
    validPayload &&
    validBitErrorRate &&
    validScale &&
    (!result.detected || typeof result.payload === 'string')
  );
}

/** Run detection in a one-time dedicated Worker and transfer a private RGBA copy. */
export function detectInvisibleWatermarkInWorker(
  pixels: InvisibleWatermarkPixelBuffer,
  detection: Pick<
    DetectInvisibleWatermarkOptions,
    'key' | 'strength' | 'search'
  >,
  options: InvisibleWatermarkWorkerOptions,
  WorkerClass: WorkerConstructor | undefined = globalThis.Worker
): Promise<InvisibleWatermarkDetectionResult> {
  report(options, 'queued');
  if (options.signal?.aborted) return Promise.reject(abortError());
  if (typeof WorkerClass !== 'function') {
    return Promise.reject(
      new Error('This browser does not support dedicated Web Workers.')
    );
  }

  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new WorkerClass(options.scriptUrl);
    } catch (error) {
      reject(error);
      return;
    }
    const id = `${Date.now().toString(36)}-${(requestSequence += 1).toString(
      36
    )}`;
    let posted = false;
    let settled = false;

    const cleanup = (): void => {
      worker.onmessage = null;
      worker.onerror = null;
      options.signal?.removeEventListener('abort', handleAbort);
      worker.terminate();
    };
    const fail = (error: unknown): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const handleAbort = (): void => fail(abortError());

    worker.onerror = () => {
      fail(
        new Error('Invisible watermark Worker script failed to load or run.')
      );
    };
    worker.onmessage = (event: MessageEvent<unknown>) => {
      const message = event.data as {
        protocol?: unknown;
        id?: unknown;
        type?: unknown;
        result?: unknown;
        code?: unknown;
        message?: unknown;
      };
      if (message?.protocol !== WORKER_PROTOCOL) {
        fail(new Error('Invisible watermark Worker protocol mismatch.'));
        return;
      }
      if (message.type === 'ready') {
        if (posted) return;
        posted = true;
        report(options, 'detecting');
        const copiedPixels = new Uint8ClampedArray(pixels.data);
        try {
          worker.postMessage(
            {
              protocol: WORKER_PROTOCOL,
              id,
              type: 'detect',
              pixels: copiedPixels.buffer,
              width: pixels.width,
              height: pixels.height,
              options: {
                key: detection.key,
                strength: detection.strength,
                search: detection.search,
              },
            },
            [copiedPixels.buffer]
          );
        } catch (error) {
          fail(error);
        }
        return;
      }
      if (message.id !== id) return;
      if (message.type === 'error') {
        const code = typeof message.code === 'string' ? message.code : 'ERROR';
        const detail =
          typeof message.message === 'string'
            ? message.message
            : 'Worker detection failed.';
        fail(new Error(`Invisible watermark Worker ${code}: ${detail}`));
        return;
      }
      if (message.type !== 'result' || !isDetectionResult(message.result)) {
        fail(new Error('Invisible watermark Worker returned invalid data.'));
        return;
      }
      if (settled) return;
      settled = true;
      report(options, 'complete');
      cleanup();
      resolve(message.result);
    };
    options.signal?.addEventListener('abort', handleAbort, { once: true });
    if (options.signal?.aborted) handleAbort();
  });
}
