import type {
  ImageMarkOptions,
  ImageOptions,
  MarkOptions,
  TextMarkOptions,
  TextOptions,
  WatermarkImageOptions,
  WatermarkLayer,
} from '../index';
import { createWatermarkRecipe, importWatermarkRecipe } from '../recipe';
import type {
  WatermarkBlobRecipeResultOptions,
  WatermarkRecipe,
  WatermarkRecipeDocument,
  WatermarkRecipeOptions,
  WatermarkRecipeResultOptions,
} from '../recipe';
import { renderWebComposition, renderWebCompositionToCanvas } from './renderer';
import type { WebRenderLayer, WebRenderRuntime } from './renderer';
import { encodeCanvasToBlob } from './helpers';
import { encodeCanvas } from './helpers';
import {
  validateImageMarkOptions,
  validateMarkOptions,
  validateTextMarkOptions,
} from '../validate';
import type {
  DetectInvisibleWatermarkOptions,
  EmbedInvisibleWatermarkOptions,
  InvisibleWatermarkDetectionData,
  InvisibleWatermarkDetectionResult,
} from '../invisible-watermark';
import { getWebImageInfo } from './browser';
import type { MarkerImageInfo } from '../image-info';
import {
  ImageMarkerError,
  createMarkerJobId,
  normalizeMarkerError,
  runControlledMarkerJob,
  runMarkerJob,
} from '../job';
import type { MarkerJobOptions } from '../job';
import { createMarkerResult } from '../result';
import type { MarkerOperation, MarkerResult } from '../result';
import { detectInvisibleWatermarkInWorker } from './invisible-worker-client';
import { runWatermarkBatch } from '../batch';
import type { WatermarkBatchOptions, WatermarkBatchResult } from '../batch';
import {
  embedInvisibleWithCredentials,
  verifyContentCredentials,
} from '../content-credentials';
import type {
  ContentCredentialsVerificationResult,
  EmbedInvisibleWithCredentialsOptions,
  EmbedInvisibleWithCredentialsResult,
  VerifyContentCredentialsOptions,
} from '../content-credentials';
import {
  detectInvisibleWatermarkPixelsAsync,
  embedInvisibleWatermarkPixels,
  validateDetectInvisibleOptions,
  validateEmbedInvisibleOptions,
} from '../invisible-watermark';
import type {
  WebMarkerCapabilities,
  WebMarkerExecutionOperation,
  WebMarkerExecutionRequest,
  WebMarkerExecutionResultKind,
  WebMarkerExecutionTask,
  WebMarkerInstance,
  WebMarkerRuntimeOptions,
} from './runtime';
export type {
  WebMarkerCapabilities,
  WebMarkerCancellationMode,
  WebMarkerExecutionAdapter,
  WebMarkerExecutionOperation,
  WebMarkerExecutionRequest,
  WebMarkerExecutionResultKind,
  WebMarkerExecutionTask,
  WebMarkerExecutionTermination,
  WebMarkerInstance,
  WebMarkerRuntimeOptions,
} from './runtime';
export type { WebResourceAdapter } from './browser';

function getPixelContext(
  canvas: Awaited<ReturnType<typeof renderWebCompositionToCanvas>>
) {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('The browser did not provide a 2D canvas context.');
  }
  return context;
}

function readImageData(
  canvas: Awaited<ReturnType<typeof renderWebCompositionToCanvas>>
) {
  try {
    return getPixelContext(canvas).getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );
  } catch (error) {
    const errorName =
      error && typeof error === 'object' && 'name' in error
        ? String((error as { name?: unknown }).name)
        : '';
    if (errorName === 'SecurityError') {
      throw new Error(
        'Unable to read image pixels because a remote image tainted the canvas. Configure CORS (Access-Control-Allow-Origin) or use a local file/data URL.'
      );
    }
    throw error;
  }
}

function createTextLayer(options: TextOptions): WebRenderLayer {
  return { type: 'text', options };
}

function createImageLayer(options: WatermarkImageOptions): WebRenderLayer {
  return { type: 'image', options };
}

function createOrderedLayer(layer: WatermarkLayer): WebRenderLayer {
  if (layer.type === 'text') {
    return createTextLayer(layer);
  }
  if (layer.type === 'image') {
    return createImageLayer(layer);
  }
  throw new Error('watermark type must be either "text" or "image".');
}

function appendCompatibilityLayers(
  layers: WebRenderLayer[],
  options: MarkOptions | ImageMarkOptions
) {
  if ('watermarkTexts' in options) {
    options.watermarkTexts?.forEach((text) =>
      layers.push(createTextLayer(text))
    );
  }
  options.watermarkImages?.forEach((image) =>
    layers.push(createImageLayer(image))
  );
}

function createMarkLayers(options: MarkOptions): WebRenderLayer[] {
  if (!options?.backgroundImage?.src) {
    throw new Error('please set image!');
  }

  const layers =
    (options.watermarks?.length ?? 0) > 0
      ? options.watermarks!.map(createOrderedLayer)
      : [];
  if (layers.length === 0) {
    appendCompatibilityLayers(layers, options);
  }
  if (layers.length === 0) {
    throw new Error('please set watermark text or image!');
  }
  if (layers.some((layer) => layer.type === 'image' && !layer.options.src)) {
    throw new Error('please set mark image!');
  }
  validateMarkOptions(options);
  return layers;
}

/**
 * Public image-marking API shared by native and Web targets.
 *
 * Metro selects the native TurboModule implementation on iOS and Android.
 * React Native Web and standard browser bundlers select this SSR-safe Canvas
 * 2D implementation, which only touches DOM globals when a method is called.
 */
class Marker {
  /** Read display dimensions, encoded dimensions, format, and orientation. */
  static getImageInfo(source: ImageOptions['src']): Promise<MarkerImageInfo> {
    return getWebImageInfo(source);
  }

  /** Embed a locator first, then ask the supplied adapter to sign the result. */
  static embedInvisibleWithCredentials(
    options: EmbedInvisibleWithCredentialsOptions,
    control?: MarkerJobOptions
  ): Promise<EmbedInvisibleWithCredentialsResult> {
    return embedInvisibleWithCredentials(
      (watermark) => Marker.embedInvisible(watermark, control),
      options
    );
  }

  /** Verify Content Credentials through an application-supplied adapter. */
  static verifyContentCredentials(
    options: VerifyContentCredentialsOptions
  ): Promise<ContentCredentialsVerificationResult> {
    return verifyContentCredentials(options);
  }

  /** Embed authenticated locators into many images while preserving input order. */
  static embedInvisibleMany(
    inputs: readonly EmbedInvisibleWatermarkOptions[],
    options?: WatermarkBatchOptions<MarkerResult>
  ): Promise<Array<WatermarkBatchResult<MarkerResult>>> {
    const snapshots = Array.isArray(inputs)
      ? inputs.map((input) => ({ ...input, image: { ...input?.image } }))
      : inputs;
    return runWatermarkBatch(
      snapshots,
      (input) => Marker.embedInvisible(input),
      options,
      4,
      'embedInvisibleMany'
    );
  }

  /** Detect authenticated locators in many images while preserving input order. */
  static detectInvisibleMany(
    inputs: readonly DetectInvisibleWatermarkOptions[],
    options?: WatermarkBatchOptions<InvisibleWatermarkDetectionResult>
  ): Promise<Array<WatermarkBatchResult<InvisibleWatermarkDetectionResult>>> {
    const snapshots = Array.isArray(inputs)
      ? inputs.map((input) => ({ ...input, image: { ...input?.image } }))
      : inputs;
    return runWatermarkBatch(
      snapshots,
      (input) => Marker.detectInvisible(input),
      options,
      4,
      'detectInvisibleMany'
    );
  }

  /**
   * Embed a short, authenticated locator into the final image pixels.
   *
   * This Beta API supports distribution tracing. It is not DRM, encryption,
   * or proof that the image was never edited.
   */
  static async embedInvisible(
    options: EmbedInvisibleWatermarkOptions,
    control?: MarkerJobOptions
  ): Promise<MarkerResult> {
    return runMarkerJob({
      descriptor: {
        operation: 'embedInvisible',
        saveFormat: options?.saveFormat,
        filename: options?.filename,
      },
      control,
      task: async () => {
        validateEmbedInvisibleOptions(options);
        const canvas = await renderWebCompositionToCanvas(options.image, [], {
          quality: options.quality,
          saveFormat: options.saveFormat,
          maxSize: options.maxSize,
        });
        const context = getPixelContext(canvas);
        const imageData = readImageData(canvas);
        embedInvisibleWatermarkPixels(
          { data: imageData.data, width: canvas.width, height: canvas.height },
          options
        );
        context.putImageData(imageData, 0, 0);
        return encodeCanvas(canvas, options.saveFormat, options.quality);
      },
    });
  }

  /** Detect and authenticate an invisible locator in an image without writing a file. */
  static async detectInvisible(
    options: DetectInvisibleWatermarkOptions,
    control?: MarkerJobOptions
  ): Promise<InvisibleWatermarkDetectionResult> {
    validateDetectInvisibleOptions(options);
    const workerController = new AbortController();
    const abortWorker = () => workerController.abort();
    options.worker?.signal?.addEventListener('abort', abortWorker, {
      once: true,
    });
    try {
      const job = await runControlledMarkerJob<InvisibleWatermarkDetectionData>(
        {
          operation: 'detectInvisible',
          control,
          workPhase: 'detecting',
          cancel: abortWorker,
          task: async () => {
            const canvas = await renderWebCompositionToCanvas(
              options.image,
              [],
              {
                saveFormat: undefined,
                maxSize: options.maxSize,
              }
            );
            const imageData = readImageData(canvas);
            if (options.worker) {
              return detectInvisibleWatermarkInWorker(
                {
                  data: imageData.data,
                  width: canvas.width,
                  height: canvas.height,
                },
                options,
                { ...options.worker, signal: workerController.signal }
              );
            }
            return detectInvisibleWatermarkPixelsAsync(
              {
                data: imageData.data,
                width: canvas.width,
                height: canvas.height,
              },
              options
            );
          },
        }
      );
      return {
        ...job.value,
        jobId: job.jobId,
        operation: 'detectInvisible',
        durationMs: job.durationMs,
      };
    } finally {
      options.worker?.signal?.removeEventListener('abort', abortWorker);
    }
  }

  /** Save ordered layers and output settings for reuse across one or many images. */
  static createRecipe<
    ResultOptions extends WatermarkRecipeResultOptions | undefined = undefined
  >(
    options: WatermarkRecipeOptions,
    resultOptions?: ResultOptions
  ): WatermarkRecipe<
    ResultOptions extends WatermarkBlobRecipeResultOptions ? Blob : MarkerResult
  > {
    if (resultOptions?.resultType === 'blob') {
      return createWatermarkRecipe(
        options,
        async (markOptions) => {
          const canvas = await renderWebCompositionToCanvas(
            markOptions.backgroundImage,
            createMarkLayers(markOptions),
            markOptions
          );
          return encodeCanvasToBlob(
            canvas,
            markOptions.saveFormat,
            markOptions.quality
          );
        },
        4
      ) as WatermarkRecipe<
        ResultOptions extends WatermarkBlobRecipeResultOptions
          ? Blob
          : MarkerResult
      >;
    }
    if (
      resultOptions?.resultType !== undefined &&
      resultOptions.resultType !== 'result'
    ) {
      throw new Error(
        `Unsupported recipe result type: ${resultOptions.resultType}.`
      );
    }
    return createWatermarkRecipe(
      options,
      (markOptions, control) => Marker.mark(markOptions, control),
      4
    ) as WatermarkRecipe<
      ResultOptions extends WatermarkBlobRecipeResultOptions
        ? Blob
        : MarkerResult
    >;
  }

  /** Import a persisted Recipe v1/v2 document, migrating v1 to v2 first. */
  static importRecipe<
    ResultOptions extends WatermarkRecipeResultOptions | undefined = undefined
  >(
    document: WatermarkRecipeDocument,
    resultOptions?: ResultOptions
  ): WatermarkRecipe<
    ResultOptions extends WatermarkBlobRecipeResultOptions ? Blob : MarkerResult
  > {
    if (resultOptions?.resultType === 'blob') {
      return importWatermarkRecipe(
        document,
        async (markOptions) => {
          const canvas = await renderWebCompositionToCanvas(
            markOptions.backgroundImage,
            createMarkLayers(markOptions),
            markOptions
          );
          return encodeCanvasToBlob(
            canvas,
            markOptions.saveFormat,
            markOptions.quality
          );
        },
        4
      ) as WatermarkRecipe<
        ResultOptions extends WatermarkBlobRecipeResultOptions
          ? Blob
          : MarkerResult
      >;
    }
    if (
      resultOptions?.resultType !== undefined &&
      resultOptions.resultType !== 'result'
    ) {
      throw new Error(
        `Unsupported recipe result type: ${resultOptions.resultType}.`
      );
    }
    return importWatermarkRecipe(
      document,
      (markOptions, control) => Marker.mark(markOptions, control),
      4
    ) as WatermarkRecipe<
      ResultOptions extends WatermarkBlobRecipeResultOptions
        ? Blob
        : MarkerResult
    >;
  }

  /** Render one or more text watermark layers. */
  static async markText(
    options: TextMarkOptions,
    control?: MarkerJobOptions
  ): Promise<MarkerResult> {
    return runMarkerJob({
      descriptor: {
        operation: 'markText',
        saveFormat: options?.saveFormat,
        filename: options?.filename,
      },
      control,
      task: async () => {
        if (!options?.backgroundImage?.src) {
          throw new Error('please set image!');
        }
        if (!options.watermarkTexts || options.watermarkTexts.length === 0) {
          throw new Error('please set watermark text!');
        }
        validateTextMarkOptions(options);
        return renderWebComposition(
          options.backgroundImage,
          options.watermarkTexts.map(createTextLayer),
          options
        );
      },
    });
  }

  /** Render one or more image watermark layers. */
  static async markImage(
    options: ImageMarkOptions,
    control?: MarkerJobOptions
  ): Promise<MarkerResult> {
    return runMarkerJob({
      descriptor: {
        operation: 'markImage',
        saveFormat: options?.saveFormat,
        filename: options?.filename,
      },
      control,
      task: async () => {
        if (!options?.backgroundImage?.src) {
          throw new Error('please set image!');
        }
        validateImageMarkOptions(options);
        const watermarkImages = options.watermarkImages ?? [];
        if (watermarkImages.length === 0) {
          throw new Error('please set mark image!');
        }
        if (watermarkImages.some((watermark) => !watermark.src)) {
          throw new Error('please set mark image!');
        }
        const layers: WebRenderLayer[] = [];
        appendCompatibilityLayers(layers, options);
        return renderWebComposition(options.backgroundImage, layers, options);
      },
    });
  }

  /** Render ordered mixed text and image watermark layers. */
  static async mark(
    options: MarkOptions,
    control?: MarkerJobOptions
  ): Promise<MarkerResult> {
    return runMarkerJob({
      descriptor: {
        operation: 'mark',
        saveFormat: options?.saveFormat,
        filename: options?.filename,
      },
      control,
      task: async () =>
        renderWebComposition(
          options.backgroundImage,
          createMarkLayers(options),
          options
        ),
    });
  }
}

type RuntimeStop = {
  code: 'ABORTED' | 'TIMEOUT';
  message: string;
  reason: 'cancel' | 'dispose' | 'signal' | 'timeout';
};

interface RuntimeTaskState {
  taskId: string;
  operation: WebMarkerExecutionOperation;
  controller: AbortController;
  stop?: RuntimeStop;
  hostTask?: WebMarkerExecutionTask<unknown>;
  termination?: Promise<void>;
  hostDisposed: boolean;
  completion: Promise<void>;
  settleCompletion: () => void;
}

interface RuntimeTaskResult<Result> {
  taskId: string;
  durationMs: number;
  value: Result;
}

function runtimeAbortError(state: RuntimeTaskState): ImageMarkerError {
  const stop = state.stop;
  return new ImageMarkerError(
    stop?.code ?? 'ABORTED',
    stop?.message ?? 'Image marker operation was aborted.',
    {
      jobId: state.taskId,
      operation: state.operation === 'getImageInfo' ? 'mark' : state.operation,
    }
  );
}

function reportRuntimeProgress(
  control: MarkerJobOptions | undefined,
  taskId: string,
  operation: MarkerOperation,
  phase:
    | 'queued'
    | 'validating'
    | 'rendering'
    | 'detecting'
    | 'encoding'
    | 'completed',
  progress: number
): void {
  try {
    control?.onProgress?.({
      jobId: taskId,
      operation,
      phase,
      completed: phase === 'completed' ? 1 : 0,
      total: 1,
      progress,
    });
  } catch {
    // Progress observers cannot interrupt a runtime task.
  }
}

function validateRuntimeControl(control: MarkerJobOptions | undefined): void {
  const timeout = control?.timeoutMs;
  if (
    timeout !== undefined &&
    (!Number.isFinite(timeout) || !Number.isInteger(timeout) || timeout <= 0)
  ) {
    throw new ImageMarkerError(
      'INVALID_OPTIONS',
      'timeoutMs must be a positive finite integer.'
    );
  }
}

function throwIfRuntimeAborted(signal: AbortSignal): void {
  if (!signal.aborted) return;
  const error = new Error('Web Marker operation was aborted.');
  error.name = 'AbortError';
  throw error;
}

function createWebMarkerCapabilities(
  hasHostAdapter: boolean
): WebMarkerCapabilities {
  return Object.freeze({
    visibleRendering: {
      engine: 'canvas-2d' as const,
      cancellation: 'host-termination-required' as const,
    },
    invisibleEmbedding: {
      engine: 'canvas-2d-pixels' as const,
      cancellation: 'host-termination-required' as const,
    },
    invisibleDetection: {
      engine: 'dedicated-worker-when-configured-or-main-thread' as const,
      workerCancellation: 'cooperative' as const,
      mainThreadCancellation: 'host-termination-required' as const,
    },
    execution: {
      mode: hasHostAdapter
        ? ('host-adapter' as const)
        : ('default-dom' as const),
      supportsTerminationAcknowledgement: hasHostAdapter,
    },
    resources: {
      localBlobInput: true as const,
      blobOutput: true as const,
      objectUrlCleanup: true as const,
    },
  });
}

/**
 * Create an isolated Web Marker instance. The legacy static `Marker` API
 * remains the default DOM path; use this factory when task cancellation and
 * resource ownership need to be scoped to a desktop application instance.
 */
export function createWebMarker(
  options: WebMarkerRuntimeOptions = {}
): WebMarkerInstance {
  const activeTasks = new Set<RuntimeTaskState>();
  const resources = options.resources;
  const execution = options.execution;
  const capabilities = createWebMarkerCapabilities(Boolean(execution));
  let isDisposed = false;

  const disposeHostTask = async (state: RuntimeTaskState): Promise<void> => {
    if (!state.hostTask || state.hostDisposed) return;
    state.hostDisposed = true;
    await state.hostTask.dispose?.();
  };

  const requestStop = (
    state: RuntimeTaskState,
    stop: RuntimeStop
  ): Promise<void> => {
    if (!state.stop) {
      state.stop = stop;
      state.controller.abort();
    }
    if (!state.hostTask || state.termination) {
      return state.termination ?? Promise.resolve();
    }
    const terminate = state.hostTask.terminate ?? state.hostTask.cancel;
    state.termination = terminate
      ? new Promise<void>((resolve, reject) => {
          try {
            resolve(
              terminate({ reason: state.stop!.reason, taskId: state.taskId })
            );
          } catch (error) {
            reject(error);
          }
        })
      : Promise.resolve();
    return state.termination;
  };

  const runRuntimeTask = async <Result>(
    operation: WebMarkerExecutionOperation,
    resultKind: WebMarkerExecutionResultKind,
    input: WebMarkerExecutionRequest['options'],
    control: MarkerJobOptions | undefined,
    workPhase: 'rendering' | 'detecting',
    local: (signal: AbortSignal) => Promise<Result>
  ): Promise<RuntimeTaskResult<Result>> => {
    validateRuntimeControl(control);
    const taskId = createMarkerJobId(
      operation === 'getImageInfo' ? 'mark' : operation
    );
    const state: RuntimeTaskState = {
      taskId,
      operation,
      controller: new AbortController(),
      hostDisposed: false,
      completion: Promise.resolve(),
      settleCompletion: () => undefined,
    };
    state.completion = new Promise<void>((resolve) => {
      state.settleCompletion = resolve;
    });
    if (isDisposed) {
      throw new ImageMarkerError(
        'ABORTED',
        'Web Marker instance is disposed.',
        {
          jobId: taskId,
          operation: operation === 'getImageInfo' ? 'mark' : operation,
        }
      );
    }
    if (control?.signal?.aborted) {
      throw new ImageMarkerError(
        'ABORTED',
        'Image marker operation was aborted before it started.',
        {
          jobId: taskId,
          operation: operation === 'getImageInfo' ? 'mark' : operation,
        }
      );
    }

    const stopFromSignal = (): void => {
      requestStop(state, {
        code: 'ABORTED',
        message: 'Image marker operation was aborted.',
        reason: 'signal',
      }).catch(() => {
        // The active task reports a host termination failure when it settles.
      });
    };
    control?.signal?.addEventListener('abort', stopFromSignal, { once: true });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (control?.timeoutMs !== undefined) {
      timeout = setTimeout(() => {
        requestStop(state, {
          code: 'TIMEOUT',
          message: `Image marker operation timed out after ${control.timeoutMs}ms.`,
          reason: 'timeout',
        }).catch(() => {
          // The active task reports a host termination failure when it settles.
        });
      }, control.timeoutMs);
    }

    activeTasks.add(state);
    const startedAt = Date.now();
    const markerOperation = operation === 'getImageInfo' ? 'mark' : operation;
    reportRuntimeProgress(control, taskId, markerOperation, 'queued', 0);
    reportRuntimeProgress(control, taskId, markerOperation, 'validating', 0.1);
    reportRuntimeProgress(control, taskId, markerOperation, workPhase, 0.25);

    try {
      let value: Result;
      if (execution) {
        const task = execution.start<Result>({
          taskId,
          operation,
          resultKind,
          options: input,
          signal: state.controller.signal,
        });
        if (!task || !task.result || typeof task.result.then !== 'function') {
          throw new Error(
            'Web Marker execution adapter must return a task with a result Promise.'
          );
        }
        state.hostTask = task as WebMarkerExecutionTask<unknown>;
        if (state.stop) {
          requestStop(state, state.stop).catch(() => {
            // The active task reports a host termination failure when it settles.
          });
        }
        value = await task.result;
      } else {
        value = await local(state.controller.signal);
      }
      if (state.stop) {
        await state.termination;
        throw runtimeAbortError(state);
      }
      reportRuntimeProgress(control, taskId, markerOperation, 'completed', 1);
      return {
        taskId,
        durationMs: Math.max(0, Date.now() - startedAt),
        value,
      };
    } catch (error) {
      if (state.stop) {
        try {
          await state.termination;
        } catch (terminationError) {
          throw normalizeMarkerError(terminationError, {
            jobId: taskId,
            operation: markerOperation,
          });
        }
        throw runtimeAbortError(state);
      }
      throw normalizeMarkerError(error, {
        jobId: taskId,
        operation: markerOperation,
      });
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
      control?.signal?.removeEventListener('abort', stopFromSignal);
      try {
        await disposeHostTask(state);
      } catch {
        // The task result remains authoritative after its host resource cleanup.
      } finally {
        activeTasks.delete(state);
        state.settleCompletion();
      }
    }
  };

  const renderRuntime = (signal: AbortSignal): WebRenderRuntime => ({
    resources,
    signal,
  });

  const stopAndWait = async (
    state: RuntimeTaskState,
    stop: RuntimeStop
  ): Promise<void> => {
    let terminationError: unknown;
    try {
      await requestStop(state, stop);
    } catch (error) {
      terminationError = error;
    }
    await state.completion;
    if (terminationError) throw terminationError;
  };

  const runMarkerOperation = async (
    operation: 'mark' | 'markText' | 'markImage' | 'embedInvisible',
    input:
      | MarkOptions
      | TextMarkOptions
      | ImageMarkOptions
      | EmbedInvisibleWatermarkOptions,
    control: MarkerJobOptions | undefined,
    local: (signal: AbortSignal) => Promise<string>
  ): Promise<MarkerResult> => {
    if (execution) {
      return (
        await runRuntimeTask<MarkerResult>(
          operation,
          'marker-result',
          input,
          control,
          'rendering',
          async () => {
            throw new Error('Host execution should have handled this task.');
          }
        )
      ).value;
    }
    const completed = await runRuntimeTask<string>(
      operation,
      'marker-result',
      input,
      control,
      'rendering',
      local
    );
    return createMarkerResult(
      completed.taskId,
      completed.value,
      completed.durationMs,
      {
        operation,
        saveFormat: input.saveFormat,
        filename: input.filename,
      }
    );
  };

  const markText = (
    markOptions: TextMarkOptions,
    control?: MarkerJobOptions
  ): Promise<MarkerResult> =>
    runMarkerOperation('markText', markOptions, control, async (signal) => {
      throwIfRuntimeAborted(signal);
      if (!markOptions?.backgroundImage?.src) {
        throw new Error('please set image!');
      }
      if (
        !markOptions.watermarkTexts ||
        markOptions.watermarkTexts.length === 0
      ) {
        throw new Error('please set watermark text!');
      }
      validateTextMarkOptions(markOptions);
      return renderWebComposition(
        markOptions.backgroundImage,
        markOptions.watermarkTexts.map(createTextLayer),
        markOptions,
        renderRuntime(signal)
      );
    });

  const markImage = (
    markOptions: ImageMarkOptions,
    control?: MarkerJobOptions
  ): Promise<MarkerResult> =>
    runMarkerOperation('markImage', markOptions, control, async (signal) => {
      throwIfRuntimeAborted(signal);
      if (!markOptions?.backgroundImage?.src) {
        throw new Error('please set image!');
      }
      validateImageMarkOptions(markOptions);
      const watermarkImages = markOptions.watermarkImages ?? [];
      if (
        watermarkImages.length === 0 ||
        watermarkImages.some((watermark) => !watermark.src)
      ) {
        throw new Error('please set mark image!');
      }
      const layers: WebRenderLayer[] = [];
      appendCompatibilityLayers(layers, markOptions);
      return renderWebComposition(
        markOptions.backgroundImage,
        layers,
        markOptions,
        renderRuntime(signal)
      );
    });

  const mark = (
    markOptions: MarkOptions,
    control?: MarkerJobOptions
  ): Promise<MarkerResult> =>
    runMarkerOperation('mark', markOptions, control, (signal) => {
      throwIfRuntimeAborted(signal);
      return renderWebComposition(
        markOptions.backgroundImage,
        createMarkLayers(markOptions),
        markOptions,
        renderRuntime(signal)
      );
    });

  const embedInvisible = (
    embedOptions: EmbedInvisibleWatermarkOptions,
    control?: MarkerJobOptions
  ): Promise<MarkerResult> =>
    runMarkerOperation(
      'embedInvisible',
      embedOptions,
      control,
      async (signal) => {
        throwIfRuntimeAborted(signal);
        validateEmbedInvisibleOptions(embedOptions);
        const canvas = await renderWebCompositionToCanvas(
          embedOptions.image,
          [],
          {
            quality: embedOptions.quality,
            saveFormat: embedOptions.saveFormat,
            maxSize: embedOptions.maxSize,
          },
          renderRuntime(signal)
        );
        throwIfRuntimeAborted(signal);
        const context = getPixelContext(canvas);
        const imageData = readImageData(canvas);
        embedInvisibleWatermarkPixels(
          { data: imageData.data, width: canvas.width, height: canvas.height },
          embedOptions
        );
        context.putImageData(imageData, 0, 0);
        throwIfRuntimeAborted(signal);
        return encodeCanvas(
          canvas,
          embedOptions.saveFormat,
          embedOptions.quality
        );
      }
    );

  const detectInvisible = async (
    detectOptions: DetectInvisibleWatermarkOptions,
    control?: MarkerJobOptions
  ): Promise<InvisibleWatermarkDetectionResult> => {
    if (execution) {
      return (
        await runRuntimeTask<InvisibleWatermarkDetectionResult>(
          'detectInvisible',
          'detection',
          detectOptions,
          control,
          'detecting',
          async () => {
            throw new Error('Host execution should have handled this task.');
          }
        )
      ).value;
    }
    const completed = await runRuntimeTask<InvisibleWatermarkDetectionData>(
      'detectInvisible',
      'detection',
      detectOptions,
      control,
      'detecting',
      async (signal) => {
        throwIfRuntimeAborted(signal);
        validateDetectInvisibleOptions(detectOptions);
        const workerController = new AbortController();
        const abortWorker = (): void => workerController.abort();
        signal.addEventListener('abort', abortWorker, { once: true });
        detectOptions.worker?.signal?.addEventListener('abort', abortWorker, {
          once: true,
        });
        try {
          const canvas = await renderWebCompositionToCanvas(
            detectOptions.image,
            [],
            { saveFormat: undefined, maxSize: detectOptions.maxSize },
            renderRuntime(signal)
          );
          const imageData = readImageData(canvas);
          if (detectOptions.worker) {
            return detectInvisibleWatermarkInWorker(
              {
                data: imageData.data,
                width: canvas.width,
                height: canvas.height,
              },
              detectOptions,
              { ...detectOptions.worker, signal: workerController.signal }
            );
          }
          return detectInvisibleWatermarkPixelsAsync(
            {
              data: imageData.data,
              width: canvas.width,
              height: canvas.height,
            },
            detectOptions
          );
        } finally {
          signal.removeEventListener('abort', abortWorker);
          detectOptions.worker?.signal?.removeEventListener(
            'abort',
            abortWorker
          );
        }
      }
    );
    return {
      ...completed.value,
      jobId: completed.taskId,
      operation: 'detectInvisible',
      durationMs: completed.durationMs,
    };
  };

  const renderBlobRecipe = async (
    markOptions: MarkOptions,
    control?: MarkerJobOptions
  ): Promise<Blob> => {
    if (execution) {
      return (
        await runRuntimeTask<Blob>(
          'mark',
          'blob',
          markOptions,
          control,
          'rendering',
          async () => {
            throw new Error('Host execution should have handled this task.');
          }
        )
      ).value;
    }
    return (
      await runRuntimeTask<Blob>(
        'mark',
        'blob',
        markOptions,
        control,
        'rendering',
        async (signal) => {
          const canvas = await renderWebCompositionToCanvas(
            markOptions.backgroundImage,
            createMarkLayers(markOptions),
            markOptions,
            renderRuntime(signal)
          );
          throwIfRuntimeAborted(signal);
          return encodeCanvasToBlob(
            canvas,
            markOptions.saveFormat,
            markOptions.quality
          );
        }
      )
    ).value;
  };

  const createRecipe = <
    ResultOptions extends WatermarkRecipeResultOptions | undefined = undefined
  >(
    recipeOptions: WatermarkRecipeOptions,
    resultOptions?: ResultOptions
  ): WatermarkRecipe<
    ResultOptions extends WatermarkBlobRecipeResultOptions ? Blob : MarkerResult
  > => {
    if (resultOptions?.resultType === 'blob') {
      return createWatermarkRecipe(
        recipeOptions,
        renderBlobRecipe,
        4
      ) as WatermarkRecipe<
        ResultOptions extends WatermarkBlobRecipeResultOptions
          ? Blob
          : MarkerResult
      >;
    }
    if (
      resultOptions?.resultType !== undefined &&
      resultOptions.resultType !== 'result'
    ) {
      throw new Error(
        `Unsupported recipe result type: ${resultOptions.resultType}.`
      );
    }
    return createWatermarkRecipe(
      recipeOptions,
      (markOptions, control) => mark(markOptions, control),
      4
    ) as WatermarkRecipe<
      ResultOptions extends WatermarkBlobRecipeResultOptions
        ? Blob
        : MarkerResult
    >;
  };

  const importRecipe = <
    ResultOptions extends WatermarkRecipeResultOptions | undefined = undefined
  >(
    document: WatermarkRecipeDocument,
    resultOptions?: ResultOptions
  ): WatermarkRecipe<
    ResultOptions extends WatermarkBlobRecipeResultOptions ? Blob : MarkerResult
  > => {
    if (resultOptions?.resultType === 'blob') {
      return importWatermarkRecipe(
        document,
        renderBlobRecipe,
        4
      ) as WatermarkRecipe<
        ResultOptions extends WatermarkBlobRecipeResultOptions
          ? Blob
          : MarkerResult
      >;
    }
    if (
      resultOptions?.resultType !== undefined &&
      resultOptions.resultType !== 'result'
    ) {
      throw new Error(
        `Unsupported recipe result type: ${resultOptions.resultType}.`
      );
    }
    return importWatermarkRecipe(
      document,
      (markOptions, control) => mark(markOptions, control),
      4
    ) as WatermarkRecipe<
      ResultOptions extends WatermarkBlobRecipeResultOptions
        ? Blob
        : MarkerResult
    >;
  };

  const instance: WebMarkerInstance = {
    capabilities,
    get disposed() {
      return isDisposed;
    },
    async getImageInfo(source) {
      if (execution) {
        return (
          await runRuntimeTask<MarkerImageInfo>(
            'getImageInfo',
            'image-info',
            source,
            undefined,
            'rendering',
            async () => {
              throw new Error('Host execution should have handled this task.');
            }
          )
        ).value;
      }
      return (
        await runRuntimeTask<MarkerImageInfo>(
          'getImageInfo',
          'image-info',
          source,
          undefined,
          'rendering',
          (signal) => {
            throwIfRuntimeAborted(signal);
            return getWebImageInfo(source, resources, signal);
          }
        )
      ).value;
    },
    markText,
    markImage,
    mark,
    embedInvisible,
    detectInvisible,
    embedInvisibleMany(inputs, batchOptions) {
      const snapshots = Array.isArray(inputs)
        ? inputs.map((input) => ({ ...input, image: { ...input?.image } }))
        : inputs;
      return runWatermarkBatch(
        snapshots,
        (input) => embedInvisible(input, { signal: batchOptions?.signal }),
        batchOptions,
        4,
        'embedInvisibleMany'
      );
    },
    detectInvisibleMany(inputs, batchOptions) {
      const snapshots = Array.isArray(inputs)
        ? inputs.map((input) => ({ ...input, image: { ...input?.image } }))
        : inputs;
      return runWatermarkBatch(
        snapshots,
        (input) => detectInvisible(input, { signal: batchOptions?.signal }),
        batchOptions,
        4,
        'detectInvisibleMany'
      );
    },
    createRecipe,
    importRecipe,
    embedInvisibleWithCredentials(credentialOptions, control) {
      return embedInvisibleWithCredentials(
        (watermark) => embedInvisible(watermark, control),
        credentialOptions
      );
    },
    verifyContentCredentials,
    async cancel() {
      await Promise.all(
        Array.from(activeTasks, (state) =>
          stopAndWait(state, {
            code: 'ABORTED',
            message:
              'Image marker operation was cancelled by its Web Marker instance.',
            reason: 'cancel',
          })
        )
      );
    },
    async dispose() {
      if (isDisposed && activeTasks.size === 0) return;
      isDisposed = true;
      const tasks = Array.from(activeTasks);
      await Promise.all(
        tasks.map((state) =>
          stopAndWait(state, {
            code: 'ABORTED',
            message:
              'Image marker operation was cancelled because its Web Marker instance was disposed.',
            reason: 'dispose',
          })
        )
      );
    },
  };
  return instance;
}

export { Marker, Marker as WebMarker };
export {
  degreesToRadians,
  encodeCanvas,
  encodeCanvasToBlob,
  fitSizeWithinMax,
  getExpandedCanvasSize,
  getRotatedBounds,
  normalizeOutputFormat,
  normalizeQuality,
  resolveAnchoredPosition,
  resolveSpreadValue,
} from './helpers';
export type {
  CanvasEncoder,
  Point,
  RotatedBounds,
  Size,
  WebOutputFormat,
} from './helpers';
export default Marker;
