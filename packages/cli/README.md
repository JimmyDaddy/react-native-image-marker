# @image-marker/cli

Automation-friendly command-line interface for Image Marker Recipe v2. It uses
`@image-marker/node` and Sharp, so it runs without React or React Native.

```sh
npm install --global @image-marker/cli
image-marker --help
```

Node.js 20.19 or newer is required.

## Start a Recipe

```sh
image-marker init
image-marker validate --recipe image-marker.recipe.json
```

`init` creates a small, editable Recipe v2 document. Outputs are never replaced
unless `--force` is passed.

## Render one image

```sh
image-marker render \
  --recipe image-marker.recipe.json \
  --input photo.jpg \
  --output marked.webp \
  --format webp \
  --quality 86 \
  --var recipient=Alice
```

Image layers with relative file paths are resolved relative to the Recipe file.
Template variables are typed automatically: `true` and `false` become booleans,
finite numeric strings become numbers, and other values remain strings.

Use `-` for one stdin input or for binary stdout:

```sh
cat photo.jpg |
  image-marker render -r recipe.json -i - -o - --quiet > marked.png
```

Recipe JSON and image bytes cannot both use stdin. Binary stdout cannot be
combined with `--json`.

## Batch rendering

```sh
image-marker batch \
  --recipe recipe.json \
  --output-dir dist \
  --concurrency 4 \
  --retries 2 \
  --retry-delay 100 \
  photo-1.jpg photo-2.jpg
```

Inputs can also be repeated with `--input` or read from a newline-delimited
`--input-list`. Empty lines and lines beginning with `#` are ignored. Results
preserve input order. The command exits `1` when any item fails.

## Inspect images

```sh
image-marker inspect photo.jpg logo.png
```

Inspect always prints JSON with encoded/display dimensions, format, EXIF
orientation, alpha, channels, and density.

## Validate and migrate Recipe documents

```sh
image-marker validate --recipe recipe-v2.json --json
image-marker migrate --recipe recipe-v1.json --output recipe-v2.json
```

`validate` intentionally rejects v1 documents. `migrate` accepts supported
legacy documents and writes canonical Recipe v2 JSON.

## Invisible locator

Keys are read from an environment variable, not a command-line argument, to
keep them out of shell history:

```sh
export IMAGE_MARKER_TRACE_KEY='replace-with-at-least-16-secret-bytes'

image-marker embed \
  --input source.png \
  --output traced.png \
  --payload asset-42

image-marker detect --input traced.png
```

Use `--key-env MY_SECRET_NAME` to select another variable. This authenticated
`lsb-hmac-v1` locator requires lossless PNG pixels. JPEG conversion, resizing,
or destructive optimization can remove it.

## Automation contract

- `--json` prints machine-readable result metadata for commands that otherwise
  report human progress.
- `--quiet` suppresses progress messages.
- File writes use a temporary sibling and atomic rename.
- Existing outputs require `--force`.
- SIGINT and SIGTERM cancel active rendering.
- Exit codes: `0` success, `1` rendering/runtime failure, `2` usage error, `3`
  locator not detected, and `130` interrupted.

The package also exports `runImageMarkerCli()` and `executeCliCommand()` for
programmatic wrappers and tests.
