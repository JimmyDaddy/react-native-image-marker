#!/usr/bin/env node

import { runImageMarkerCli } from './cli';

const abortController = new AbortController();
const abort = () => abortController.abort();
process.once('SIGINT', abort);
process.once('SIGTERM', abort);

runImageMarkerCli(process.argv.slice(2), {
  signal: abortController.signal,
})
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((reason: unknown) => {
    process.stderr.write(
      `Image Marker fatal error: ${
        reason instanceof Error ? reason.message : String(reason)
      }\n`
    );
    process.exitCode = 1;
  })
  .finally(() => {
    process.removeListener('SIGINT', abort);
    process.removeListener('SIGTERM', abort);
  });
