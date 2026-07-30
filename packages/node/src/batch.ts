import { setTimeout as delay } from 'node:timers/promises';
import { abortError } from './source';
import type {
  NodeBatchItemResult,
  NodeBatchRenderOptions,
  NodeRenderResult,
} from './types';

function positiveInteger(value: number, label: string): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite integer.`);
  }
  return value;
}

function nonNegativeInteger(value: number, label: string): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite integer.`);
  }
  return value;
}

export async function runNodeRenderBatch<Input>(
  inputs: readonly Input[],
  render: (input: Input, index: number) => Promise<NodeRenderResult>,
  options: NodeBatchRenderOptions,
  maximumConcurrency: number
): Promise<NodeBatchItemResult[]> {
  if (!Array.isArray(inputs)) {
    throw new Error('Node batch inputs must be an array.');
  }
  if (inputs.length === 0) return [];
  const concurrency = Math.min(
    positiveInteger(options.concurrency ?? 1, 'concurrency'),
    maximumConcurrency,
    inputs.length
  );
  const retries = nonNegativeInteger(options.retries ?? 0, 'retries');
  const retryDelayMs = nonNegativeInteger(
    options.retryDelayMs ?? 0,
    'retryDelayMs'
  );
  const results: Array<NodeBatchItemResult | undefined> = new Array(
    inputs.length
  );
  let cursor = 0;
  let settled = 0;
  let succeeded = 0;
  let failed = 0;
  let aborted = 0;

  const report = (index: number, result: NodeBatchItemResult) => {
    settled += 1;
    if (result.status === 'fulfilled') succeeded += 1;
    else if (result.status === 'rejected') failed += 1;
    else aborted += 1;
    try {
      options.onBatchProgress?.({
        total: inputs.length,
        settled,
        succeeded,
        failed,
        aborted,
        index,
        result,
      });
    } catch {
      // Observers do not change batch settlement.
    }
  };

  const worker = async () => {
    while (!options.signal?.aborted) {
      const index = cursor;
      cursor += 1;
      if (index >= inputs.length) return;
      let attempts = 0;
      let result: NodeBatchItemResult | undefined;
      while (attempts <= retries && !options.signal?.aborted) {
        attempts += 1;
        try {
          result = {
            status: 'fulfilled',
            value: await render(inputs[index]!, index),
            attempts,
          };
          break;
        } catch (reason) {
          if (options.signal?.aborted) break;
          if (attempts > retries) {
            result = { status: 'rejected', reason, attempts };
            break;
          }
          try {
            options.onRetry?.({ index, attempt: attempts + 1, reason });
          } catch {
            // Retry observers do not interrupt rendering.
          }
          if (retryDelayMs > 0) {
            try {
              await delay(retryDelayMs, undefined, {
                signal: options.signal,
              });
            } catch {
              break;
            }
          }
        }
      }
      if (!result) {
        result = {
          status: 'aborted',
          reason: abortError(
            'Batch item was aborted before rendering completed.'
          ),
          attempts,
        };
      }
      results[index] = result;
      report(index, result);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
  for (let index = 0; index < inputs.length; index += 1) {
    if (results[index]) continue;
    const result: NodeBatchItemResult = {
      status: 'aborted',
      reason: abortError('Batch item was not started because it was aborted.'),
      attempts: 0,
    };
    results[index] = result;
    report(index, result);
  }
  return results as NodeBatchItemResult[];
}
