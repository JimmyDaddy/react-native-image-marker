import {
  ImageMarkerError,
  createMarkerJobId,
  runControlledMarkerJob,
  runMarkerJob,
} from '../job';

describe('structured marker jobs', () => {
  it('returns structured output and ordered lifecycle progress', async () => {
    const phases: string[] = [];
    const result = await runMarkerJob({
      descriptor: {
        operation: 'mark',
        saveFormat: 'png',
        filename: 'example',
      },
      control: {
        onProgress(progress) {
          phases.push(progress.phase);
        },
      },
      task: async () => 'data:image/png;base64,result',
    });

    expect(result).toEqual(
      expect.objectContaining({
        jobId: expect.stringMatching(/^mark-/),
        operation: 'mark',
        uri: 'data:image/png;base64,result',
        output: 'data-url',
        format: 'png',
        mimeType: 'image/png',
        filename: 'example',
      })
    );
    expect(phases).toEqual([
      'queued',
      'validating',
      'rendering',
      'encoding',
      'completed',
    ]);
  });

  it('describes WebP output without conflating it with JPEG', async () => {
    await expect(
      runMarkerJob({
        descriptor: { operation: 'mark', saveFormat: 'webp' },
        task: async () => '/tmp/result.webp',
      })
    ).resolves.toEqual(
      expect.objectContaining({
        format: 'webp',
        mimeType: 'image/webp',
      })
    );
  });

  it('controls structured detection jobs with the same lifecycle model', async () => {
    const phases: string[] = [];
    const result = await runControlledMarkerJob({
      operation: 'detectInvisible',
      workPhase: 'detecting',
      control: {
        onProgress(progress) {
          phases.push(progress.phase);
        },
      },
      task: async () => ({ detected: false }),
    });

    expect(result).toEqual(
      expect.objectContaining({
        jobId: expect.stringMatching(/^detectInvisible-/),
        value: { detected: false },
      })
    );
    expect(phases).toEqual(['queued', 'validating', 'detecting', 'completed']);
  });

  it('aborts an active operation and asks the native layer to cancel it', async () => {
    const controller = new AbortController();
    const cancelled: string[] = [];
    let settle: ((value: string) => void) | undefined;
    const operation = runMarkerJob({
      descriptor: { operation: 'markText' },
      control: { signal: controller.signal },
      cancel(jobId) {
        cancelled.push(jobId);
        return true;
      },
      task: () =>
        new Promise<string>((resolve) => {
          settle = resolve;
        }),
    });

    controller.abort();
    await expect(operation).rejects.toEqual(
      expect.objectContaining({
        name: 'ImageMarkerError',
        code: 'ABORTED',
        operation: 'markText',
      })
    );
    expect(cancelled).toHaveLength(1);
    settle?.('/tmp/ignored.jpg');
  });

  it('enforces timeouts and ignores observer failures', async () => {
    const cancelled: string[] = [];
    const operation = runMarkerJob({
      descriptor: { operation: 'markImage' },
      control: {
        timeoutMs: 5,
        onProgress() {
          throw new Error('observer failure');
        },
      },
      cancel(jobId) {
        cancelled.push(jobId);
      },
      task: () => new Promise<string>(() => {}),
    });

    await expect(operation).rejects.toEqual(
      expect.objectContaining({ code: 'TIMEOUT', operation: 'markImage' })
    );
    expect(cancelled).toHaveLength(1);
  });

  it('rejects invalid timeout values with the shared error model', async () => {
    await expect(
      runMarkerJob({
        descriptor: { operation: 'mark' },
        control: { timeoutMs: 0 },
        task: async () => '/tmp/result.jpg',
      })
    ).rejects.toEqual(
      expect.objectContaining({
        name: 'ImageMarkerError',
        code: 'INVALID_OPTIONS',
      })
    );
  });

  it('creates collision-resistant operation-scoped IDs', () => {
    const first = createMarkerJobId('mark');
    const second = createMarkerJobId('mark');
    expect(first).not.toBe(second);
    expect(first).toMatch(/^mark-/);
  });

  it('preserves an existing ImageMarkerError', () => {
    const error = new ImageMarkerError('ENCODE_FAILED', 'failed');
    expect(error.code).toBe('ENCODE_FAILED');
    expect(error.name).toBe('ImageMarkerError');
  });
});
