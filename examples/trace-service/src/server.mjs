import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createSharpCodec } from './sharp-codec.mjs';
import { createRequestHandler } from './service.mjs';

const require = createRequire(import.meta.url);
const {
  createInvisibleWatermarkRuntime,
} = require('../../../trace-runtime.js');

const key = process.env.TRACE_WATERMARK_KEY;
if (!key || Buffer.byteLength(key, 'utf8') < 16) {
  throw new Error('TRACE_WATERMARK_KEY must contain at least 16 UTF-8 bytes.');
}

const runtime = createInvisibleWatermarkRuntime({
  codec: createSharpCodec(),
  maxConcurrency: 4,
});
const server = createServer(
  createRequestHandler({ runtime, keyProvider: () => key })
);
const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 8787);

server.listen(port, host, () => {
  console.log(`Trace Service listening at http://${host}:${port}`);
});
