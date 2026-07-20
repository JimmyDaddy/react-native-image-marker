import { detectInvisibleWatermarkPixels } from '../invisible-watermark';
import type {
  InvisibleWatermarkSearch,
  InvisibleWatermarkStrength,
} from '../invisible-watermark';

const WORKER_PROTOCOL = 1 as const;

interface WorkerRequest {
  protocol: number;
  id: string;
  type: 'detect';
  pixels: ArrayBuffer;
  width: number;
  height: number;
  options: {
    key: string;
    strength?: InvisibleWatermarkStrength;
    search?: InvisibleWatermarkSearch;
  };
}

interface WorkerScope {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: unknown): void;
}

const workerScope = self as unknown as WorkerScope;

workerScope.onmessage = (event) => {
  const request = event.data as Partial<WorkerRequest>;
  if (
    request?.protocol !== WORKER_PROTOCOL ||
    request.type !== 'detect' ||
    typeof request.id !== 'string' ||
    !(request.pixels instanceof ArrayBuffer) ||
    typeof request.width !== 'number' ||
    typeof request.height !== 'number' ||
    !request.options
  ) {
    workerScope.postMessage({
      protocol: WORKER_PROTOCOL,
      id: typeof request?.id === 'string' ? request.id : '',
      type: 'error',
      code: 'INVALID_REQUEST',
      message: 'The detection request is invalid.',
    });
    return;
  }
  try {
    const result = detectInvisibleWatermarkPixels(
      {
        data: new Uint8ClampedArray(request.pixels),
        width: request.width,
        height: request.height,
      },
      request.options
    );
    workerScope.postMessage({
      protocol: WORKER_PROTOCOL,
      id: request.id,
      type: 'result',
      result,
    });
  } catch {
    workerScope.postMessage({
      protocol: WORKER_PROTOCOL,
      id: request.id,
      type: 'error',
      code: 'DETECTION_FAILED',
      message: 'The image or detection options could not be processed.',
    });
  }
};

workerScope.postMessage({ protocol: WORKER_PROTOCOL, type: 'ready' });
