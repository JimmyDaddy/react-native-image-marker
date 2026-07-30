---
title: Command-line interface
description: Validate, migrate, render, inspect, and batch Recipe v2 workflows from a terminal or CI job.
---

`@image-marker/cli@0.1` exposes the Node renderer as the `image-marker`
command. It is designed for scripts and CI, with stable exit codes, JSON
output, stdin/stdout support, atomic writes, bounded concurrency, and signal
cancellation.

```sh
npm install --global @image-marker/cli@^0.1
image-marker --help
```

Node.js 20.19 or newer is required.

## Start, validate, and render

```sh
image-marker init
image-marker validate --recipe image-marker.recipe.json

image-marker render \
  --recipe image-marker.recipe.json \
  --input photo.jpg \
  --output marked.webp \
  --format webp \
  --quality 86 \
  --var recipient=Alice
```

Existing outputs are protected unless `--force` is passed. Relative image
layer paths are resolved from the Recipe file. Use `-` for binary stdin or
stdout, and `--json` for machine-readable result metadata.

## Commands

- `init`: create an editable Recipe v2 document.
- `validate`: validate a Recipe v2 document.
- `migrate`: convert a supported v1 Recipe to canonical v2.
- `render`: render one image.
- `batch`: render ordered inputs with concurrency and retry.
- `inspect`: print image metadata as JSON.
- `embed`: add an authenticated lossless PNG locator.
- `detect`: recover and verify a locator.

Locator keys are read from an environment variable rather than a command-line
argument. Exit codes are stable: `0` success, `1` runtime failure, `2` usage
error, `3` locator not found, and `130` interrupted.

Use the [`@image-marker/node` API](/node/) when JavaScript needs direct
in-process control, or the [Recipe package](/recipe/) when a tool only needs to
create and validate documents.
