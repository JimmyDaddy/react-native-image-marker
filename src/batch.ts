export interface WatermarkBatchFulfilledResult<Result> {
  status: 'fulfilled';
  value: Result;
}

export interface WatermarkBatchRejectedResult {
  status: 'rejected';
  reason: unknown;
}

export interface WatermarkBatchAbortedResult {
  status: 'aborted';
  reason: Error;
}

export type WatermarkBatchResult<Result> =
  | WatermarkBatchFulfilledResult<Result>
  | WatermarkBatchRejectedResult
  | WatermarkBatchAbortedResult;

export interface WatermarkBatchProgress<Result> {
  total: number;
  settled: number;
  succeeded: number;
  failed: number;
  aborted: number;
  /** Index of the item that produced this progress update. */
  index: number;
  result: WatermarkBatchResult<Result>;
}

export interface WatermarkBatchOptions<Result> {
  /** Requested worker count. Web is capped at 4 and native targets at 1. */
  concurrency?: number;
  /** Stops new items from starting. Already-running items are allowed to finish. */
  signal?: AbortSignal;
  /** Called once when each item is fulfilled, rejected, or skipped after abort. */
  onProgress?: (progress: WatermarkBatchProgress<Result>) => void;
}

function abortResult<Result>(): WatermarkBatchResult<Result> {
  const reason = new Error(
    'Batch item was not started because the operation was aborted.'
  );
  reason.name = 'AbortError';
  return { status: 'aborted', reason };
}

export async function runWatermarkBatch<Input, Result>(
  inputs: readonly Input[],
  task: (input: Input, index: number) => Promise<Result>,
  batchOptions: WatermarkBatchOptions<Result> = {},
  maximumConcurrency = 1,
  inputLabel = 'batch'
): Promise<Array<WatermarkBatchResult<Result>>> {
  if (!Array.isArray(inputs)) {
    throw new Error(`${inputLabel} inputs must be an array.`);
  }
  const requestedConcurrency = batchOptions.concurrency ?? 1;
  if (
    !Number.isFinite(requestedConcurrency) ||
    !Number.isInteger(requestedConcurrency) ||
    requestedConcurrency <= 0
  ) {
    throw new Error('concurrency must be a positive finite integer.');
  }
  if (inputs.length === 0) {
    return [];
  }

  const concurrency = Math.min(
    requestedConcurrency,
    maximumConcurrency,
    inputs.length
  );
  const results: Array<WatermarkBatchResult<Result> | undefined> = new Array(
    inputs.length
  );
  let cursor = 0;
  let settled = 0;
  let succeeded = 0;
  let failed = 0;
  let aborted = 0;

  const report = (
    index: number,
    result: WatermarkBatchResult<Result>
  ): void => {
    settled += 1;
    if (result.status === 'fulfilled') succeeded += 1;
    else if (result.status === 'rejected') failed += 1;
    else aborted += 1;
    try {
      batchOptions.onProgress?.({
        total: inputs.length,
        settled,
        succeeded,
        failed,
        aborted,
        index,
        result,
      });
    } catch {
      // Progress observers must not interrupt the batch or change results.
    }
  };

  const worker = async (): Promise<void> => {
    while (!batchOptions.signal?.aborted) {
      const index = cursor;
      cursor += 1;
      if (index >= inputs.length) {
        return;
      }
      if (batchOptions.signal?.aborted) {
        return;
      }
      let result: WatermarkBatchResult<Result>;
      try {
        result = {
          status: 'fulfilled',
          value: await task(inputs[index] as Input, index),
        };
      } catch (reason) {
        result = { status: 'rejected', reason };
      }
      results[index] = result;
      report(index, result);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));

  for (let index = 0; index < inputs.length; index += 1) {
    if (!results[index]) {
      const result = abortResult<Result>();
      results[index] = result;
      report(index, result);
    }
  }

  return results as Array<WatermarkBatchResult<Result>>;
}
