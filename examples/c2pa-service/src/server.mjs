import { createServer } from 'node:http';
import { createC2paEngineFromEnvironment } from './c2pa-engine.mjs';
import { createRequestHandler } from './service.mjs';

const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const engine = await createC2paEngineFromEnvironment();
const server = createServer(createRequestHandler({ engine }));
server.listen(port, host, () => {
  console.log(`C2PA example service listening on http://${host}:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
