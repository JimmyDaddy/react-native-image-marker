import { writeFile } from 'node:fs/promises';
import type { Readable } from 'node:stream';
import {
  materializeWatermarkRecipe,
  migrateWatermarkRecipe,
  type WatermarkImageLayer,
  type WatermarkRecipeDefinitionLayer,
  type WatermarkTextLayer,
} from '@image-marker/recipe';
import { runNodeRenderBatch } from './batch';
import { detectNodeInvisible, embedNodeInvisible } from './invisible';
import {
  createTextSvg,
  resolveOverlayPosition,
  sharpBlendMode,
  tileOverlayPositions,
  type OverlayPosition,
  type OverlaySize,
} from './layout';
import {
  bufferToReadable,
  reportProgress,
  sourceToSharpInput,
  throwIfAborted,
} from './source';
import type {
  NodeBatchRenderOptions,
  NodeFileRenderResult,
  NodeImageFormat,
  NodeImageInfo,
  NodeImageMarker,
  NodeImageMarkerOptions,
  NodeImageSource,
  NodeInvisibleDetectOptions,
  NodeInvisibleDetectionResult,
  NodeInvisibleEmbedOptions,
  NodeRecipeDocument,
  NodeRenderInput,
  NodeRenderOptions,
  NodeRenderResult,
} from './types';

type SharpFactory = typeof import('sharp').default;
type SharpOverlay = import('sharp').OverlayOptions;

const MIME_TYPES: Record<NodeImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function positiveInteger(value: number, label: string): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite integer.`);
  }
  return value;
}

function positiveNumber(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
  return value;
}

async function loadSharp(injected?: SharpFactory): Promise<SharpFactory> {
  if (injected) return injected;
  try {
    const module = await import('sharp');
    return module.default;
  } catch (reason) {
    throw new Error(
      'The optional "sharp" peer is required by @image-marker/node. Install sharp@>=0.35.0 in the application.',
      { cause: reason }
    );
  }
}

function outputFormat(recipe: ReturnType<typeof migrateWatermarkRecipe>) {
  const requested = recipe.output.saveFormat;
  if (requested === 'jpg') return 'jpeg' as const;
  if (requested === 'webp') return 'webp' as const;
  return 'png' as const;
}

async function applyOpacity(
  sharp: SharpFactory,
  input: Buffer<ArrayBuffer>,
  opacity: number
): Promise<Buffer<ArrayBuffer>> {
  if (opacity >= 1) return input;
  const decoded = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = Buffer.from(decoded.data);
  for (let offset = 3; offset < pixels.length; offset += 4) {
    pixels[offset] = Math.round(pixels[offset]! * Math.max(0, opacity));
  }
  return sharp(pixels, {
    raw: {
      width: decoded.info.width,
      height: decoded.info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

async function prepareTextOverlay(
  sharp: SharpFactory,
  layer: WatermarkTextLayer,
  canvasWidth: number
): Promise<{ data: Buffer; size: OverlaySize }> {
  const svg = createTextSvg(layer, canvasWidth);
  let pipeline = sharp(svg.data, { density: 72 });
  const rotation = layer.style?.rotate ?? 0;
  if (rotation) {
    pipeline = pipeline.rotate(rotation, {
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  }
  const result = await pipeline.png().toBuffer({ resolveWithObject: true });
  return {
    data: result.data,
    size: { width: result.info.width, height: result.info.height },
  };
}

async function prepareImageOverlay(
  sharp: SharpFactory,
  layer: WatermarkImageLayer<NodeImageSource>,
  signal?: AbortSignal
): Promise<{ data: Buffer; size: OverlaySize }> {
  const source = await sourceToSharpInput(layer.src, signal);
  throwIfAborted(signal);
  let pipeline = sharp(source).rotate();
  if (layer.trimTransparentPadding) pipeline = pipeline.trim();
  const initial = await pipeline.png().toBuffer({ resolveWithObject: true });
  const scale = positiveNumber(layer.scale ?? 1, `${layer.id}.scale`);
  pipeline = sharp(initial.data);
  if (scale !== 1) {
    pipeline = pipeline.resize({
      width: Math.max(1, Math.round(initial.info.width * scale)),
      height: Math.max(1, Math.round(initial.info.height * scale)),
      fit: 'fill',
    });
  }
  if (layer.rotate) {
    pipeline = pipeline.rotate(layer.rotate, {
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  }
  let result = await pipeline.png().toBuffer({ resolveWithObject: true });
  if ((layer.alpha ?? 1) < 1) {
    result = {
      ...result,
      data: await applyOpacity(sharp, result.data, layer.alpha ?? 1),
    };
  }
  return {
    data: result.data,
    size: { width: result.info.width, height: result.info.height },
  };
}

async function clipOverlay(
  sharp: SharpFactory,
  data: Buffer,
  position: OverlayPosition,
  size: OverlaySize,
  canvas: OverlaySize
): Promise<{ data: Buffer; left: number; top: number } | undefined> {
  const left = Math.max(0, position.left);
  const top = Math.max(0, position.top);
  const cropLeft = Math.max(0, -position.left);
  const cropTop = Math.max(0, -position.top);
  const width = Math.min(size.width - cropLeft, canvas.width - left);
  const height = Math.min(size.height - cropTop, canvas.height - top);
  if (width <= 0 || height <= 0) return undefined;
  if (
    cropLeft === 0 &&
    cropTop === 0 &&
    width === size.width &&
    height === size.height
  ) {
    return { data, left, top };
  }
  return {
    data: await sharp(data)
      .extract({
        left: cropLeft,
        top: cropTop,
        width,
        height,
      })
      .png()
      .toBuffer(),
    left,
    top,
  };
}

async function layerOverlays(
  sharp: SharpFactory,
  layer: WatermarkRecipeDefinitionLayer<NodeImageSource>,
  canvas: OverlaySize,
  signal?: AbortSignal
): Promise<SharpOverlay[]> {
  if (layer.visible === false) return [];
  const prepared =
    layer.type === 'text'
      ? await prepareTextOverlay(sharp, layer, canvas.width)
      : await prepareImageOverlay(sharp, layer, signal);
  const base = resolveOverlayPosition(layer.position, canvas, prepared.size);
  const layout = layer.layout?.type === 'tile' ? layer.layout : undefined;
  const positions = tileOverlayPositions(base, canvas, prepared.size, layout);
  const overlays: SharpOverlay[] = [];
  for (const position of positions) {
    throwIfAborted(signal);
    const clipped = await clipOverlay(
      sharp,
      prepared.data,
      position,
      prepared.size,
      canvas
    );
    if (!clipped) continue;
    overlays.push({
      input: clipped.data,
      left: clipped.left,
      top: clipped.top,
      blend: sharpBlendMode(layer.blendMode),
    });
  }
  return overlays;
}

function orientationDetails(orientation: number) {
  switch (orientation) {
    case 2:
      return { rotationDegrees: 0 as const, mirrored: true };
    case 3:
      return { rotationDegrees: 180 as const, mirrored: false };
    case 4:
      return { rotationDegrees: 180 as const, mirrored: true };
    case 5:
      return { rotationDegrees: 90 as const, mirrored: true };
    case 6:
      return { rotationDegrees: 90 as const, mirrored: false };
    case 7:
      return { rotationDegrees: 270 as const, mirrored: true };
    case 8:
      return { rotationDegrees: 270 as const, mirrored: false };
    default:
      return { rotationDegrees: 0 as const, mirrored: false };
  }
}

function mimeType(format: string | undefined): string | undefined {
  switch (format) {
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'heif':
      return 'image/heif';
    default:
      return undefined;
  }
}

export function createNodeImageMarker(
  options: NodeImageMarkerOptions = {}
): NodeImageMarker {
  const maximumConcurrency = positiveInteger(
    options.maxConcurrency ?? 8,
    'maxConcurrency'
  );
  let sharpPromise: Promise<SharpFactory> | undefined;
  const sharp = () => (sharpPromise ??= loadSharp(options.sharp));

  const inspect = async (source: NodeImageSource): Promise<NodeImageInfo> => {
    const factory = await sharp();
    const input = await sourceToSharpInput(source);
    const metadata = await factory(input).metadata();
    const encodedWidth = metadata.width ?? 0;
    const encodedHeight = metadata.height ?? 0;
    if (encodedWidth <= 0 || encodedHeight <= 0) {
      throw new Error('Sharp could not determine positive image dimensions.');
    }
    const orientation = metadata.orientation ?? 1;
    const swaps = orientation >= 5;
    const transform = orientationDetails(orientation);
    return {
      width: swaps ? encodedHeight : encodedWidth,
      height: swaps ? encodedWidth : encodedHeight,
      encodedWidth,
      encodedHeight,
      format: metadata.format ?? 'unknown',
      mimeType: mimeType(metadata.format),
      orientation,
      ...transform,
      requiresNormalization: orientation !== 1,
      space: metadata.space,
      channels: metadata.channels,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      size: metadata.size,
    };
  };

  const render = async (
    document: NodeRecipeDocument,
    renderInput: NodeRenderInput,
    renderOptions: NodeRenderOptions = {}
  ): Promise<NodeRenderResult> => {
    const startedAt = performance.now();
    throwIfAborted(renderOptions.signal);
    reportProgress(renderOptions.onProgress, {
      phase: 'queued',
      progress: 0,
    });
    const factory = await sharp();
    const recipe = materializeWatermarkRecipe(
      migrateWatermarkRecipe<NodeImageSource>(document),
      {
        filename: renderInput.filename,
        variables: renderInput.variables,
      }
    );
    reportProgress(renderOptions.onProgress, {
      phase: 'decoding',
      progress: 0.15,
    });
    const backgroundInput = await sourceToSharpInput(
      renderInput.backgroundImage.src,
      renderOptions.signal
    );
    const normalizedBackground = await factory(backgroundInput)
      .rotate()
      .png()
      .toBuffer({ resolveWithObject: true });
    let background = factory(normalizedBackground.data);
    const backgroundScale = positiveNumber(
      renderInput.backgroundImage.scale ?? 1,
      'backgroundImage.scale'
    );
    if (backgroundScale !== 1) {
      background = background.resize({
        width: Math.max(
          1,
          Math.round(normalizedBackground.info.width * backgroundScale)
        ),
        height: Math.max(
          1,
          Math.round(normalizedBackground.info.height * backgroundScale)
        ),
        fit: 'fill',
      });
    }
    if (renderInput.backgroundImage.rotate) {
      background = background.rotate(renderInput.backgroundImage.rotate, {
        background: recipe.output.matteColor ?? '#00000000',
      });
      if (recipe.output.rotationCanvasMode === 'crop') {
        background = background.resize({
          width: Math.max(
            1,
            Math.round(normalizedBackground.info.width * backgroundScale)
          ),
          height: Math.max(
            1,
            Math.round(normalizedBackground.info.height * backgroundScale)
          ),
          fit: 'cover',
        });
      }
    }
    let base = await background.png().toBuffer({ resolveWithObject: true });
    if ((renderInput.backgroundImage.alpha ?? 1) < 1) {
      base = {
        ...base,
        data: await applyOpacity(
          factory,
          base.data,
          renderInput.backgroundImage.alpha ?? 1
        ),
      };
    }
    const canvas = { width: base.info.width, height: base.info.height };
    reportProgress(renderOptions.onProgress, {
      phase: 'compositing',
      progress: 0.35,
    });
    const overlays: SharpOverlay[] = [];
    for (const layer of recipe.layers) {
      throwIfAborted(renderOptions.signal);
      overlays.push(
        ...(await layerOverlays(factory, layer, canvas, renderOptions.signal))
      );
    }
    const composited =
      overlays.length > 0
        ? await factory(base.data).composite(overlays).png().toBuffer()
        : base.data;
    let output = factory(composited);
    if (recipe.output.maxSize) {
      output = output.resize({
        width: recipe.output.maxSize,
        height: recipe.output.maxSize,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    reportProgress(renderOptions.onProgress, {
      phase: 'encoding',
      progress: 0.85,
    });
    const format = outputFormat(recipe);
    const quality = Math.max(1, Math.min(recipe.output.quality ?? 90, 100));
    if (format === 'jpeg') {
      output = output
        .flatten({ background: recipe.output.matteColor ?? '#FFFFFF' })
        .jpeg({ quality });
    } else if (format === 'webp') {
      output = output.webp({ quality });
    } else {
      output = output.png({ quality });
    }
    const encoded = await output.toBuffer({ resolveWithObject: true });
    throwIfAborted(renderOptions.signal);
    const result: NodeRenderResult = {
      data: encoded.data,
      format,
      mimeType: MIME_TYPES[format],
      width: encoded.info.width,
      height: encoded.info.height,
      durationMs: Math.max(0, performance.now() - startedAt),
    };
    reportProgress(renderOptions.onProgress, {
      phase: 'complete',
      progress: 1,
    });
    return result;
  };

  return {
    inspect,
    render,
    async renderToFile(
      recipe,
      input,
      outputPath,
      renderOptions
    ): Promise<NodeFileRenderResult> {
      if (!outputPath.trim()) throw new Error('outputPath must not be empty.');
      const result = await render(recipe, input, renderOptions);
      await writeFile(outputPath, result.data);
      return { ...result, path: outputPath };
    },
    async renderToStream(recipe, input, renderOptions): Promise<Readable> {
      return bufferToReadable(
        (await render(recipe, input, renderOptions)).data
      );
    },
    renderMany(recipe, inputs, batchOptions: NodeBatchRenderOptions = {}) {
      return runNodeRenderBatch(
        inputs,
        (input) =>
          render(recipe, input, {
            signal: batchOptions.signal,
            onProgress: batchOptions.onProgress,
          }),
        batchOptions,
        maximumConcurrency
      );
    },
    async embedInvisible(
      invisibleOptions: NodeInvisibleEmbedOptions
    ): Promise<NodeRenderResult> {
      return embedNodeInvisible(await sharp(), invisibleOptions);
    },
    async detectInvisible(
      invisibleOptions: NodeInvisibleDetectOptions
    ): Promise<NodeInvisibleDetectionResult> {
      return detectNodeInvisible(await sharp(), invisibleOptions);
    },
  };
}
