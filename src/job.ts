import type { MarkerOperation, MarkerResult } from './result';
import { createMarkerResult, type MarkerResultDescriptor } from './result';

export type ImageMarkerErrorCode =
  | 'ABORTED'
  | 'TIMEOUT'
  | 'INVALID_OPTIONS'
  | 'LINKING_ERROR'
  | 'NATIVE_ERROR'
  | 'RENDER_FAILED'
  | 'ENCODE_FAILED'
  | 'DECODE_FAILED'
  | 'UNKNOWN';

export type MarkerJobPhase =
  | 'queued'
  | 'validating'
  | 'rendering'
  | 'detecting'
  | 'encoding'
  | 'completed';

export interface MarkerJobProgress {
  jobId: string;
  operation: MarkerOperation;
  phase: MarkerJobPhase;
  completed: number;
  total: 1;
  progress: number;
}

export interface MarkerJobOptions {
  signal?: AbortSignal;
  /** Reject and cancel the native operation after this many milliseconds. */
  timeoutMs?: number;
  /** Observer failures never interrupt image processing. */
  onProgress?: (progress: MarkerJobProgress) => void;
}

export class ImageMarkerError extends Error {
  readonly code: ImageMarkerErrorCode;
  readonly jobId?: string;
  readonly operation?: MarkerOperation;
  readonly cause?: unknown;

  constructor(
    code: ImageMarkerErrorCode,
    message: string,
    context: {
      jobId?: string;
      operation?: MarkerOperation;
      cause?: unknown;
    } = {}
  ) {
    super(message);
    this.name = 'ImageMarkerError';
    this.code = code;
    this.jobId = context.jobId;
    this.operation = context.operation;
    this.cause = context.cause;
  }
}

let jobSequence = 0;

export function createMarkerJobId(operation: MarkerOperation): string {
  jobSequence = (jobSequence + 1) % Number.MAX_SAFE_INTEGER;
  return `${operation}-${Date.now().toString(36)}-${jobSequence.toString(36)}`;
}

function validateControlOptions(options: MarkerJobOptions): void {
  if (
    options.timeoutMs !== undefined &&
    (!Number.isFinite(options.timeoutMs) ||
      !Number.isInteger(options.timeoutMs) ||
      options.timeoutMs <= 0)
  ) {
    throw new ImageMarkerError(
      'INVALID_OPTIONS',
      'timeoutMs must be a positive finite integer.'
    );
  }
}

function report(
  options: MarkerJobOptions,
  jobId: string,
  operation: MarkerOperation,
  phase: MarkerJobPhase,
  progress: number
): void {
  try {
    options.onProgress?.({
      jobId,
      operation,
      phase,
      completed: phase === 'completed' ? 1 : 0,
      total: 1,
      progress,
    });
  } catch {
    // Progress observers cannot change operation results.
  }
}

function inferErrorCode(error: unknown): ImageMarkerErrorCode {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();
  if (message.includes('link') || message.includes('expo go')) {
    return 'LINKING_ERROR';
  }
  if (message.includes('decode') || message.includes('load image')) {
    return 'DECODE_FAILED';
  }
  if (message.includes('encode') || message.includes('save')) {
    return 'ENCODE_FAILED';
  }
  if (
    message.includes('required') ||
    message.includes('invalid') ||
    message.includes('must be') ||
    message.includes('please set')
  ) {
    return 'INVALID_OPTIONS';
  }
  if (message.includes('render') || message.includes('watermark')) {
    return 'RENDER_FAILED';
  }
  return 'NATIVE_ERROR';
}

export function normalizeMarkerError(
  error: unknown,
  context: { jobId: string; operation: MarkerOperation }
): ImageMarkerError {
  if (error instanceof ImageMarkerError) {
    return error;
  }
  const message =
    error instanceof Error && error.message
      ? error.message
      : 'Image marker operation failed.';
  return new ImageMarkerError(inferErrorCode(error), message, {
    ...context,
    cause: error,
  });
}

interface RunControlledMarkerJobOptions<Result> {
  operation: MarkerOperation;
  control?: MarkerJobOptions;
  task: (jobId: string) => Promise<Result>;
  cancel?: (jobId: string) => Promise<unknown> | unknown;
  workPhase?: Extract<MarkerJobPhase, 'rendering' | 'detecting'>;
  finishingPhase?: Extract<MarkerJobPhase, 'encoding'>;
}

export interface ControlledMarkerJobResult<Result> {
  jobId: string;
  durationMs: number;
  value: Result;
}

export async function runControlledMarkerJob<Result>({
  operation,
  control = {},
  task,
  cancel,
  workPhase = 'rendering',
  finishingPhase,
}: RunControlledMarkerJobOptions<Result>): Promise<
  ControlledMarkerJobResult<Result>
> {
  validateControlOptions(control);
  const jobId = createMarkerJobId(operation);
  const startedAt = Date.now();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let rejectControl: ((error: ImageMarkerError) => void) | undefined;
  let controlSettled = false;

  const cancelWith = (code: 'ABORTED' | 'TIMEOUT', message: string): void => {
    if (controlSettled) return;
    controlSettled = true;
    Promise.resolve(cancel?.(jobId)).catch(() => {
      // The original abort/timeout remains authoritative.
    });
    rejectControl?.(
      new ImageMarkerError(code, message, {
        jobId,
        operation,
      })
    );
  };

  const onAbort = (): void =>
    cancelWith('ABORTED', 'Image marker operation was aborted.');

  if (control.signal?.aborted) {
    throw new ImageMarkerError(
      'ABORTED',
      'Image marker operation was aborted before it started.',
      { jobId, operation }
    );
  }

  const controlPromise = new Promise<never>((_resolve, reject) => {
    rejectControl = reject;
  });
  control.signal?.addEventListener('abort', onAbort, { once: true });
  if (control.timeoutMs !== undefined) {
    timeout = setTimeout(
      () =>
        cancelWith(
          'TIMEOUT',
          `Image marker operation timed out after ${control.timeoutMs}ms.`
        ),
      control.timeoutMs
    );
  }

  report(control, jobId, operation, 'queued', 0);
  report(control, jobId, operation, 'validating', 0.1);

  try {
    report(control, jobId, operation, workPhase, 0.25);
    const value = await Promise.race([task(jobId), controlPromise]);
    controlSettled = true;
    if (finishingPhase) {
      report(control, jobId, operation, finishingPhase, 0.85);
    }
    const result = {
      jobId,
      durationMs: Math.max(0, Date.now() - startedAt),
      value,
    };
    report(control, jobId, operation, 'completed', 1);
    return result;
  } catch (error) {
    throw normalizeMarkerError(error, { jobId, operation });
  } finally {
    controlSettled = true;
    if (timeout !== undefined) clearTimeout(timeout);
    control.signal?.removeEventListener('abort', onAbort);
  }
}

interface RunMarkerJobOptions {
  descriptor: MarkerResultDescriptor;
  control?: MarkerJobOptions;
  task: (jobId: string) => Promise<string>;
  cancel?: (jobId: string) => Promise<unknown> | unknown;
}

export async function runMarkerJob({
  descriptor,
  control = {},
  task,
  cancel,
}: RunMarkerJobOptions): Promise<MarkerResult> {
  const result = await runControlledMarkerJob({
    operation: descriptor.operation,
    control,
    task,
    cancel,
    workPhase: 'rendering',
    finishingPhase: 'encoding',
  });
  return createMarkerResult(
    result.jobId,
    result.value,
    result.durationMs,
    descriptor
  );
}
