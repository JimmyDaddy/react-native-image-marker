import type {
  ImageMarkOptions,
  ImageOptions,
  MarkOptions,
  TextMarkOptions,
} from '../index';
import type {
  ContentCredentialsVerificationResult,
  EmbedInvisibleWithCredentialsOptions,
  EmbedInvisibleWithCredentialsResult,
  VerifyContentCredentialsOptions,
} from '../content-credentials';
import type {
  DetectInvisibleWatermarkOptions,
  EmbedInvisibleWatermarkOptions,
  InvisibleWatermarkDetectionResult,
} from '../invisible-watermark';
import type { MarkerJobOptions } from '../job';
import type { MarkerImageInfo } from '../image-info';
import type { WatermarkBatchOptions, WatermarkBatchResult } from '../batch';
import type {
  WatermarkBlobRecipeResultOptions,
  WatermarkRecipe,
  WatermarkRecipeDocument,
  WatermarkRecipeOptions,
  WatermarkRecipeResultOptions,
} from '../recipe';
import type { MarkerOperation, MarkerResult } from '../result';
import type { WebResourceAdapter } from './browser';

/** Public operations that a host executor can take outside the DOM realm. */
export type WebMarkerExecutionOperation = MarkerOperation | 'getImageInfo';

/** The shape of a value returned by an isolated host executor. */
export type WebMarkerExecutionResultKind =
  | 'marker-result'
  | 'blob'
  | 'detection'
  | 'image-info';

/** A cooperative or host-enforced stop request for one execution task. */
export interface WebMarkerExecutionTermination {
  reason: 'cancel' | 'dispose' | 'signal' | 'timeout';
  /** The instance-specific id supplied to `start`. */
  taskId: string;
}

/**
 * A real execution unit returned by a host adapter. `result` must settle only
 * when the unit has actually stopped or completed. `terminate` is the hook
 * used by `cancel()`/`dispose()` to ask an isolated Tauri Worker, process, or
 * other host-owned unit to stop; its fulfilled promise is the acknowledgement.
 */
export interface WebMarkerExecutionTask<Result = unknown> {
  result: Promise<Result>;
  terminate?: (
    termination: WebMarkerExecutionTermination
  ) => Promise<void> | void;
  /** Alias for hosts whose task API calls the real stop operation `cancel`. */
  cancel?: (termination: WebMarkerExecutionTermination) => Promise<void> | void;
  /** Releases task-local host resources after a completed or stopped task. */
  dispose?: () => Promise<void> | void;
}

/**
 * Task request for a host execution boundary. The host owns transport and
 * isolation: map image resources and observer callbacks to your IPC protocol,
 * and forward cancellation explicitly. AbortSignal and loaded DOM images are
 * not directly transferable. The SDK does not pass an executable task closure.
 */
export interface WebMarkerExecutionRequest {
  taskId: string;
  operation: WebMarkerExecutionOperation;
  resultKind: WebMarkerExecutionResultKind;
  options:
    | TextMarkOptions
    | ImageMarkOptions
    | MarkOptions
    | EmbedInvisibleWatermarkOptions
    | DetectInvisibleWatermarkOptions
    | ImageOptions['src'];
  signal: AbortSignal;
}

/**
 * Optional boundary for dispatching whole image operations to a host-owned
 * execution unit. It is intentionally task based, so a Tauri application can
 * adapt it to its own IPC rather than relying on a JavaScript closure.
 */
export interface WebMarkerExecutionAdapter {
  start<Result = unknown>(
    request: WebMarkerExecutionRequest
  ): WebMarkerExecutionTask<Result>;
}

export type WebMarkerCancellationMode =
  | 'cooperative'
  | 'host-termination-required';

/** Runtime facts a desktop host can use when selecting an execution boundary. */
export interface WebMarkerCapabilities {
  visibleRendering: {
    engine: 'canvas-2d';
    cancellation: 'host-termination-required';
  };
  invisibleEmbedding: {
    engine: 'canvas-2d-pixels';
    cancellation: 'host-termination-required';
  };
  invisibleDetection: {
    engine: 'dedicated-worker-when-configured-or-main-thread';
    workerCancellation: 'cooperative';
    mainThreadCancellation: 'host-termination-required';
  };
  execution: {
    mode: 'default-dom' | 'host-adapter';
    supportsTerminationAcknowledgement: boolean;
  };
  resources: {
    localBlobInput: true;
    blobOutput: true;
    objectUrlCleanup: true;
  };
}

export interface WebMarkerRuntimeOptions {
  /** Supplies DOM-adjacent resources such as Image, Canvas, and object URLs. */
  resources?: WebResourceAdapter;
  /** Takes complete tasks in a host-owned execution or isolation boundary. */
  execution?: WebMarkerExecutionAdapter;
}

export interface WebMarkerInstance {
  readonly capabilities: WebMarkerCapabilities;
  readonly disposed: boolean;
  getImageInfo(source: ImageOptions['src']): Promise<MarkerImageInfo>;
  markText(
    options: TextMarkOptions,
    control?: MarkerJobOptions
  ): Promise<MarkerResult>;
  markImage(
    options: ImageMarkOptions,
    control?: MarkerJobOptions
  ): Promise<MarkerResult>;
  mark(options: MarkOptions, control?: MarkerJobOptions): Promise<MarkerResult>;
  embedInvisible(
    options: EmbedInvisibleWatermarkOptions,
    control?: MarkerJobOptions
  ): Promise<MarkerResult>;
  detectInvisible(
    options: DetectInvisibleWatermarkOptions,
    control?: MarkerJobOptions
  ): Promise<InvisibleWatermarkDetectionResult>;
  embedInvisibleMany(
    inputs: readonly EmbedInvisibleWatermarkOptions[],
    options?: WatermarkBatchOptions<MarkerResult>
  ): Promise<Array<WatermarkBatchResult<MarkerResult>>>;
  detectInvisibleMany(
    inputs: readonly DetectInvisibleWatermarkOptions[],
    options?: WatermarkBatchOptions<InvisibleWatermarkDetectionResult>
  ): Promise<Array<WatermarkBatchResult<InvisibleWatermarkDetectionResult>>>;
  createRecipe<
    ResultOptions extends WatermarkRecipeResultOptions | undefined = undefined
  >(
    options: WatermarkRecipeOptions,
    resultOptions?: ResultOptions
  ): WatermarkRecipe<
    ResultOptions extends WatermarkBlobRecipeResultOptions ? Blob : MarkerResult
  >;
  importRecipe<
    ResultOptions extends WatermarkRecipeResultOptions | undefined = undefined
  >(
    document: WatermarkRecipeDocument,
    resultOptions?: ResultOptions
  ): WatermarkRecipe<
    ResultOptions extends WatermarkBlobRecipeResultOptions ? Blob : MarkerResult
  >;
  embedInvisibleWithCredentials(
    options: EmbedInvisibleWithCredentialsOptions,
    control?: MarkerJobOptions
  ): Promise<EmbedInvisibleWithCredentialsResult>;
  verifyContentCredentials(
    options: VerifyContentCredentialsOptions
  ): Promise<ContentCredentialsVerificationResult>;
  /** Abort all current instance tasks and await host termination acknowledgements. */
  cancel(): Promise<void>;
  /** Cancel current work, release task resources, and reject future operations. */
  dispose(): Promise<void>;
}
