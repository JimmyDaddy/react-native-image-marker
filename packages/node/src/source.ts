import { once } from 'node:events';
import { Readable } from 'node:stream';
import type { NodeImageSource, NodeRenderProgress } from './types';

export function abortError(
  message = 'The image operation was aborted.'
): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

export function reportProgress(
  observer: ((progress: NodeRenderProgress) => void) | undefined,
  progress: NodeRenderProgress
): void {
  try {
    observer?.(progress);
  } catch {
    // Observers cannot interrupt an image operation.
  }
}

function isReadable(source: NodeImageSource): source is Readable {
  return (
    source instanceof Readable ||
    (typeof source === 'object' &&
      source !== null &&
      typeof (source as unknown as Readable).pipe === 'function' &&
      typeof (source as unknown as Readable)[Symbol.asyncIterator] ===
        'function')
  );
}

export async function sourceToSharpInput(
  source: NodeImageSource,
  signal?: AbortSignal
): Promise<string | Buffer> {
  throwIfAborted(signal);
  if (typeof source === 'string') return source;
  if (Buffer.isBuffer(source)) return source;
  if (source instanceof Uint8Array) return Buffer.from(source);
  if (!isReadable(source)) {
    throw new TypeError(
      'Image source must be a file path, Buffer, Uint8Array, or readable Stream.'
    );
  }
  const chunks: Buffer[] = [];
  const onAbort = () => source.destroy(abortError());
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    for await (const chunk of source) {
      throwIfAborted(signal);
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
  return Buffer.concat(chunks);
}

export function bufferToReadable(data: Buffer): Readable {
  return Readable.from(data);
}

export async function waitForWritableDrain(stream: NodeJS.WritableStream) {
  await once(stream, 'drain');
}
