import {
  ImageFormat,
  createWebMarker,
  type WebMarkerExecutionAdapter,
  type WebMarkerExecutionRequest,
  type WebMarkerExecutionTask,
  type WebResourceAdapter,
} from '@image-marker/web';

function assert(checks: string[], value: unknown, message: string): void {
  if (!value) throw new Error(message);
  checks.push(message);
}

function canvas(width: number, height: number, color: string) {
  const result = document.createElement('canvas');
  result.width = width;
  result.height = height;
  const context = result.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable in the consumer.');
  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
  return result;
}

async function pngFile(width: number, height: number): Promise<File> {
  const source = canvas(width, height, '#ffffff');
  const encoded = await new Promise<Blob>((resolve, reject) =>
    source.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error('Unable to encode fixture.')),
      'image/png'
    )
  );
  return new File([encoded], 'runtime-fixture.png', { type: 'image/png' });
}

async function expectAbort(
  value: Promise<unknown>,
  message: string
): Promise<void> {
  try {
    await value;
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? (error as { code?: unknown }).code
        : undefined;
    if (code === 'ABORTED') return;
    throw new Error(`${message}: expected ABORTED, received ${String(code)}`);
  }
  throw new Error(`${message}: expected operation to reject.`);
}

type PendingTask = {
  result: Promise<unknown>;
  resolve(value: unknown): void;
  reject(reason: unknown): void;
  acknowledgeTermination?: () => void;
};

type WorkerMessage =
  | { type: 'started'; taskId: string }
  | { type: 'completed'; taskId: string; value: unknown }
  | { type: 'terminated'; taskId: string }
  | { type: 'stopped'; taskId: string };

function createHostExecution(
  options: { forceWorkerTermination?: boolean } = {}
) {
  const worker = new Worker('/host-executor-worker.js', { type: 'module' });
  const pending = new Map<string, PendingTask>();
  const started = new Map<string, () => void>();
  const startWaiters = new Set<() => void>();
  const terminationWaiters = new Set<() => void>();
  const terminatedTaskIds: string[] = [];
  let startedCount = 0;
  let terminateCalls = 0;
  let terminationAcknowledgements = 0;
  let forcedWorkerTerminations = 0;
  let resultSettlements = 0;
  let disposeCalls = 0;
  let workerClosed = false;

  worker.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;
    if (message.type === 'started') {
      startedCount += 1;
      started.get(message.taskId)?.();
      started.delete(message.taskId);
      for (const resolve of startWaiters) resolve();
      startWaiters.clear();
      return;
    }
    const task = pending.get(message.taskId);
    if (!task) return;
    if (message.type === 'completed') {
      pending.delete(message.taskId);
      task.resolve(message.value);
      return;
    }
    if (message.type === 'terminated') {
      terminatedTaskIds.push(message.taskId);
      terminationAcknowledgements += 1;
      task.acknowledgeTermination?.();
      for (const resolve of terminationWaiters) resolve();
      terminationWaiters.clear();
      return;
    }
    if (message.type === 'stopped') {
      pending.delete(message.taskId);
      task.reject(new Error('Host Worker terminated the task.'));
    }
  });

  const execution: WebMarkerExecutionAdapter = {
    start<Result>(
      request: WebMarkerExecutionRequest
    ): WebMarkerExecutionTask<Result> {
      let resolveResult: (value: Result) => void = () => undefined;
      let rejectResult: (reason: unknown) => void = () => undefined;
      const result = new Promise<Result>((resolve, reject) => {
        resolveResult = resolve;
        rejectResult = reject;
      });
      result.then(
        () => {
          resultSettlements += 1;
        },
        () => {
          resultSettlements += 1;
        }
      );
      const startedPromise = new Promise<void>((resolve) => {
        started.set(request.taskId, resolve);
      });
      const task: PendingTask = {
        result,
        resolve: (value) => resolveResult(value as Result),
        reject: rejectResult,
      };
      pending.set(request.taskId, task);
      worker.postMessage({
        type: 'start',
        taskId: request.taskId,
        operation: request.operation,
        resultKind: request.resultKind,
        // Visible operations remain pending until an explicit host stop. The
        // metadata operation completes normally for the cancel-after test.
        delayMs: request.operation === 'getImageInfo' ? 0 : 60_000,
      });

      return {
        result,
        async terminate() {
          terminateCalls += 1;
          await startedPromise;
          if (options.forceWorkerTermination) {
            forcedWorkerTerminations += 1;
            workerClosed = true;
            worker.terminate();
            pending.delete(request.taskId);
            task.reject(new Error('Host forcibly terminated its Worker.'));
            return;
          }
          await new Promise<void>((resolve) => {
            task.acknowledgeTermination = resolve;
            worker.postMessage({ type: 'terminate', taskId: request.taskId });
          });
        },
        dispose() {
          disposeCalls += 1;
        },
      };
    },
  };

  return {
    execution,
    get terminateCalls() {
      return terminateCalls;
    },
    get terminationAcknowledgements() {
      return terminationAcknowledgements;
    },
    get forcedWorkerTerminations() {
      return forcedWorkerTerminations;
    },
    get resultSettlements() {
      return resultSettlements;
    },
    get disposeCalls() {
      return disposeCalls;
    },
    waitForNextStart() {
      const expected = startedCount + 1;
      if (startedCount >= expected) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const wait = () => {
          if (startedCount >= expected) resolve();
          else startWaiters.add(wait);
        };
        wait();
      });
    },
    waitForNextTermination() {
      if (terminatedTaskIds.length > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        terminationWaiters.add(resolve);
      });
    },
    settleNextTermination() {
      const taskId = terminatedTaskIds.shift();
      if (!taskId) throw new Error('No Worker termination is awaiting settle.');
      worker.postMessage({ type: 'settle', taskId });
    },
    close() {
      if (workerClosed) return;
      workerClosed = true;
      worker.terminate();
    },
  };
}

function textRequest(source: File) {
  return {
    backgroundImage: { src: source },
    watermarkTexts: [{ text: 'runtime', style: { color: '#111111' } }],
    saveFormat: ImageFormat.png,
  };
}

export async function verifyRuntime(checks: string[]): Promise<void> {
  const source = await pngFile(48, 32);
  const createdUrls: string[] = [];
  const revokedUrls: string[] = [];
  const resources: WebResourceAdapter = {
    createObjectURL(value) {
      const url = URL.createObjectURL(value as Blob);
      createdUrls.push(url);
      return url;
    },
    revokeObjectURL(url) {
      revokedUrls.push(url);
      URL.revokeObjectURL(url);
    },
  };

  const first = createWebMarker({ resources });
  const second = createWebMarker();
  assert(
    checks,
    first.capabilities.execution.mode === 'default-dom',
    'default Web Marker declares DOM execution capabilities'
  );

  const [firstResult, secondResult] = await Promise.all([
    first.markText(textRequest(source)),
    second.markText(textRequest(source)),
  ]);
  assert(
    checks,
    firstResult.uri.startsWith('data:image/png') &&
      secondResult.uri.startsWith('data:image/png'),
    'independent Web Marker instances render concurrently'
  );
  assert(
    checks,
    createdUrls.length > 0 &&
      createdUrls.every((url) => revokedUrls.includes(url)),
    'per-instance object URLs are revoked after File rendering'
  );

  const recipe = first.createRecipe(
    {
      schemaVersion: 2,
      layers: [{ id: 'runtime', type: 'text', text: 'Blob output' }],
      output: { saveFormat: 'png' },
    },
    { resultType: 'blob' }
  );
  const output = await recipe.apply({ backgroundImage: { src: source } });
  assert(
    checks,
    output instanceof Blob && output.type === 'image/png',
    'instance Recipe accepts File input and returns a PNG Blob'
  );

  await first.dispose();
  await expectAbort(
    first.markText(textRequest(source)),
    'disposed default instance'
  );
  const secondAfterFirstDispose = await second.markText(textRequest(source));
  assert(
    checks,
    secondAfterFirstDispose.uri.startsWith('data:image/png'),
    'disposing one instance does not affect another instance'
  );
  await second.dispose();

  const host = createHostExecution();
  try {
    const marker = createWebMarker({ execution: host.execution });
    assert(
      checks,
      marker.capabilities.execution.mode === 'host-adapter' &&
        marker.capabilities.execution.supportsTerminationAcknowledgement,
      'host execution capability reports acknowledgement support'
    );

    const before = new AbortController();
    before.abort();
    await expectAbort(
      marker.markText(textRequest(source), { signal: before.signal }),
      'pre-aborted host task'
    );
    assert(
      checks,
      host.terminateCalls === 0,
      'pre-aborted work never asks the host Worker to terminate'
    );

    const startMidFlight = host.waitForNextStart();
    const pending = marker.markText(textRequest(source));
    await startMidFlight;
    const pendingAbort = expectAbort(pending, 'mid-flight host task');
    const cancellation = Promise.all([marker.cancel(), marker.cancel()]);
    let cancellationResolved = false;
    cancellation.then(() => {
      cancellationResolved = true;
    });
    await host.waitForNextTermination();
    await Promise.resolve();
    assert(
      checks,
      !cancellationResolved,
      'cancel waits for the stopped Worker result after its termination acknowledgement'
    );
    host.settleNextTermination();
    await Promise.all([cancellation, pendingAbort]);
    assert(
      checks,
      host.terminateCalls === 1 && host.terminationAcknowledgements === 1,
      'repeated cancellation receives one real Worker termination acknowledgement'
    );
    assert(
      checks,
      host.disposeCalls === 1,
      'cancelled host task releases task-local host resources once'
    );

    const info = await marker.getImageInfo(source);
    assert(
      checks,
      info.width === 48 && info.height === 32,
      'host execution can complete a metadata task'
    );
    const terminatedAfterCompletion = host.terminateCalls;
    await marker.cancel();
    await marker.cancel();
    assert(
      checks,
      host.terminateCalls === terminatedAfterCompletion,
      'cancel after completion does not invent a host stop'
    );

    const startDuringDispose = host.waitForNextStart();
    const duringDispose = marker.markText(textRequest(source));
    await startDuringDispose;
    const duringDisposeAbort = expectAbort(
      duringDispose,
      'dispose mid-flight host task'
    );
    const disposal = Promise.all([marker.dispose(), marker.dispose()]);
    let disposalResolved = false;
    disposal.then(() => {
      disposalResolved = true;
    });
    await host.waitForNextTermination();
    await Promise.resolve();
    assert(
      checks,
      !disposalResolved,
      'dispose waits for the stopped Worker result after its termination acknowledgement'
    );
    host.settleNextTermination();
    await Promise.all([disposal, duringDisposeAbort]);
    await expectAbort(
      marker.getImageInfo(source),
      'disposed host instance rejects future work'
    );
    assert(
      checks,
      marker.disposed && host.terminationAcknowledgements === 2,
      'dispose waits for the host Worker termination acknowledgement'
    );
  } finally {
    host.close();
  }

  const forceTerminatedHost = createHostExecution({
    forceWorkerTermination: true,
  });
  try {
    const marker = createWebMarker({
      execution: forceTerminatedHost.execution,
    });
    const taskStarted = forceTerminatedHost.waitForNextStart();
    const active = marker.markText(textRequest(source));
    await taskStarted;
    const activeAbort = expectAbort(active, 'force-terminated host task');
    await marker.cancel();
    await activeAbort;
    assert(
      checks,
      forceTerminatedHost.forcedWorkerTerminations === 1 &&
        forceTerminatedHost.resultSettlements === 1 &&
        forceTerminatedHost.disposeCalls === 1,
      'real Worker.terminate settles the host task and cleans it up once'
    );
    await marker.dispose();
  } finally {
    forceTerminatedHost.close();
  }
}
