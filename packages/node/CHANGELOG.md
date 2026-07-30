# Changelog

## 0.1.0 (2026-07-30)

- Required Sharp 0.35 or newer to avoid vulnerable libvips builds.
- Added a pure Node.js Recipe v2 renderer with an optional Sharp peer.
- Added Buffer, path, Uint8Array, and Stream inputs plus Buffer, file, and
  Stream outputs.
- Added visible text/image layers, layout, blend, sizing, rotation, and output
  encoding.
- Added ordered batch rendering with concurrency, progress, cancellation,
  retries, and retry callbacks.
- Added authenticated lossless invisible locators and image inspection.
