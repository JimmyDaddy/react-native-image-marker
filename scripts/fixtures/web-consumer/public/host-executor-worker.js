/* global self */

// This is a test host execution unit, not a Canvas renderer. It models a
// desktop-owned Worker. It acknowledges receipt of a stop request separately
// from the terminal result notification so the consumer proves that the SDK
// waits for both; this worker does not implement the image algorithm.
const tasks = new Map();

function markerResult(taskId, operation) {
  return {
    jobId: taskId,
    operation,
    uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwIJvPVAewAAAABJRU5ErkJggg==',
    output: 'data-url',
    format: 'png',
    mimeType: 'image/png',
    durationMs: 1,
    metadata: { orientation: 'normalized', policy: 'strip' },
  };
}

self.addEventListener('message', (event) => {
  const message = event.data;
  if (message?.type === 'start') {
    const task = {
      taskId: message.taskId,
      operation: message.operation,
      resultKind: message.resultKind,
      timer: undefined,
    };
    tasks.set(task.taskId, task);
    self.postMessage({ type: 'started', taskId: task.taskId });
    task.timer = setTimeout(() => {
      if (!tasks.delete(task.taskId)) return;
      const value =
        task.resultKind === 'image-info'
          ? {
              width: 48,
              height: 32,
              encodedWidth: 48,
              encodedHeight: 32,
              format: 'png',
              mimeType: 'image/png',
              orientation: 1,
              rotationDegrees: 0,
              mirrored: false,
              requiresNormalization: false,
            }
          : markerResult(task.taskId, task.operation);
      self.postMessage({ type: 'completed', taskId: task.taskId, value });
    }, message.delayMs);
    return;
  }

  if (message?.type === 'terminate') {
    const task = tasks.get(message.taskId);
    if (!task) return;
    clearTimeout(task.timer);
    task.timer = undefined;
    self.postMessage({ type: 'terminated', taskId: task.taskId });
    return;
  }

  if (message?.type === 'settle') {
    const task = tasks.get(message.taskId);
    if (!task) return;
    tasks.delete(message.taskId);
    self.postMessage({ type: 'stopped', taskId: task.taskId });
  }
});
