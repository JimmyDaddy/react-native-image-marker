# Trace Service example

This independent Node.js 22 example embeds and detects `dct-qim-v1` trace locators with the package's on-demand runtime and a `sharp` codec. It is not installed with the main package, and `sharp` remains outside the SDK's production dependencies.

## Run locally

Build the root package once, then start the service:

```sh
npm run prepack
npm --prefix examples/trace-service install
export TRACE_WATERMARK_KEY='replace-with-at-least-16-secret-bytes'
npm --prefix examples/trace-service start
```

The server listens on `127.0.0.1:8787` by default. Set `HOST` and `PORT` only when your deployment boundary is ready. This example has no user authentication: put it behind your application's TLS, authentication, authorization, rate limiting, request logging policy, and abuse controls before exposing it to a network.

To evaluate the container boundary, build from the repository root so the
multi-stage build can compile the on-demand runtime without shipping root
development dependencies:

```sh
docker build -f examples/trace-service/Dockerfile -t image-marker-trace .
docker run --rm -p 127.0.0.1:8787:8787 \
  -e TRACE_WATERMARK_KEY='replace-with-at-least-16-secret-bytes' \
  image-marker-trace
```

The container binds `0.0.0.0` internally but the example command publishes it
only on host loopback. Use an orchestrator secret instead of a literal
environment value in production.

The service never accepts the watermark key in a request. Production code should replace the environment lookup with a secret manager and replace the in-memory store with a durable, access-controlled store that has an explicit retention policy.

## API

All three endpoints accept JSON with a base64 JPEG or PNG:

```json
{
  "image": {
    "base64": "...",
    "mimeType": "image/png"
  }
}
```

- `POST /v1/traces/embed` also accepts `locator`, optional `metadata`, `strength`, `format`, `quality`, and `maxSize`.
- `POST /v1/traces/detect` accepts optional `strength`, `search`, and `maxSize`.
- `POST /v1/traces/verify` returns independent `trace`, `record`, and optional `credentials` results.

Only put a random, short locator in the pixels. Keep names, email addresses, order details, and other personal data in the protected server-side record.

## Use the runtime in another Node service

The Node runtime is an explicit subpath, so importing the normal React Native API does not load it:

```js
const {
  createInvisibleWatermarkRuntime,
} = require('react-native-image-marker/trace-runtime.js');

const runtime = createInvisibleWatermarkRuntime({
  codec: yourCodec,
  maxConcurrency: 4,
});
```

The codec must normalize orientation, preserve aspect ratio, enforce `maxSize`, and return RGBA pixels. See `src/sharp-codec.mjs` for a reference implementation.

## Content Credentials

Pass an adapter with `sign()` and/or `verify()` to `createRequestHandler()` to compose this service with the repository's C2PA example. Locator detection and Content Credentials verification are reported independently; failure in one does not rewrite the result of the other.

## Reliability benchmark

```sh
npm --prefix examples/trace-service run benchmark
```

This writes a local, ignored JSON report for PNG, JPEG recompression, and supported resize candidates. It records outcomes, not runner timing, so results stay useful across machines.
