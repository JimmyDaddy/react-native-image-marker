import type { Readable } from 'node:stream';
import type {
  WatermarkRecipeDefinition,
  WatermarkRecipeDocument,
  WatermarkRecipeInput,
} from '@image-marker/recipe';

export type NodeImageSource = string | Buffer | Uint8Array | Readable;
export type NodeImageFormat = 'jpeg' | 'png' | 'webp';

export interface NodeRenderInput
  extends WatermarkRecipeInput<NodeImageSource> {}

export type NodeRecipeDocument = WatermarkRecipeDocument<NodeImageSource>;
export type NodeRecipeDefinition = WatermarkRecipeDefinition<NodeImageSource>;

export type NodeRenderPhase =
  | 'queued'
  | 'decoding'
  | 'compositing'
  | 'encoding'
  | 'complete';

export interface NodeRenderProgress {
  phase: NodeRenderPhase;
  progress: number;
}

export interface NodeRenderOptions {
  signal?: AbortSignal;
  onProgress?: (progress: NodeRenderProgress) => void;
}

export interface NodeRenderResult {
  data: Buffer;
  format: NodeImageFormat;
  mimeType: string;
  width: number;
  height: number;
  durationMs: number;
}

export interface NodeFileRenderResult extends NodeRenderResult {
  path: string;
}

export interface NodeImageInfo {
  width: number;
  height: number;
  encodedWidth: number;
  encodedHeight: number;
  format: string;
  mimeType?: string;
  orientation: number;
  rotationDegrees: 0 | 90 | 180 | 270;
  mirrored: boolean;
  requiresNormalization: boolean;
  space?: string;
  channels?: number;
  density?: number;
  hasAlpha?: boolean;
  size?: number;
}

export interface NodeBatchFulfilledResult {
  status: 'fulfilled';
  value: NodeRenderResult;
  attempts: number;
}

export interface NodeBatchRejectedResult {
  status: 'rejected';
  reason: unknown;
  attempts: number;
}

export interface NodeBatchAbortedResult {
  status: 'aborted';
  reason: Error;
  attempts: number;
}

export type NodeBatchItemResult =
  | NodeBatchFulfilledResult
  | NodeBatchRejectedResult
  | NodeBatchAbortedResult;

export interface NodeBatchProgress {
  total: number;
  settled: number;
  succeeded: number;
  failed: number;
  aborted: number;
  index: number;
  result: NodeBatchItemResult;
}

export interface NodeBatchRenderOptions extends NodeRenderOptions {
  concurrency?: number;
  retries?: number;
  retryDelayMs?: number;
  onRetry?: (event: {
    index: number;
    attempt: number;
    reason: unknown;
  }) => void;
  onBatchProgress?: (progress: NodeBatchProgress) => void;
}

export interface NodeInvisibleEmbedOptions {
  image: NodeImageSource;
  payload: string;
  key: string | Buffer;
  signal?: AbortSignal;
}

export interface NodeInvisibleDetectOptions {
  image: NodeImageSource;
  key: string | Buffer;
  signal?: AbortSignal;
}

export interface NodeInvisibleDetectionResult {
  detected: boolean;
  payload?: string;
  confidence: number;
  algorithm: 'lsb-hmac-v1';
}

export interface NodeImageMarkerOptions {
  /** Hard upper bound used when batch options request more workers. */
  maxConcurrency?: number;
  /** Test/custom injection point. Normal callers should install Sharp. */
  sharp?: typeof import('sharp').default;
}

export interface NodeImageMarker {
  inspect(source: NodeImageSource): Promise<NodeImageInfo>;
  render(
    recipe: NodeRecipeDocument,
    input: NodeRenderInput,
    options?: NodeRenderOptions
  ): Promise<NodeRenderResult>;
  renderToFile(
    recipe: NodeRecipeDocument,
    input: NodeRenderInput,
    outputPath: string,
    options?: NodeRenderOptions
  ): Promise<NodeFileRenderResult>;
  renderToStream(
    recipe: NodeRecipeDocument,
    input: NodeRenderInput,
    options?: NodeRenderOptions
  ): Promise<Readable>;
  renderMany(
    recipe: NodeRecipeDocument,
    inputs: readonly NodeRenderInput[],
    options?: NodeBatchRenderOptions
  ): Promise<NodeBatchItemResult[]>;
  embedInvisible(options: NodeInvisibleEmbedOptions): Promise<NodeRenderResult>;
  detectInvisible(
    options: NodeInvisibleDetectOptions
  ): Promise<NodeInvisibleDetectionResult>;
}
