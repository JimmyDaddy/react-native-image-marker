import Marker, {
  ImageFormat,
  Position,
  RotationCanvasMode,
  migrateWatermarkRecipe,
  type WatermarkRecipeDefinition,
} from '@image-marker/web';
import { ImageMarkerEditorController } from '@image-marker/web/headless';
import { createWebEditorAdapter } from '@image-marker/web/editor-adapter';
import workerUrl from '@image-marker/web/worker?url';
import { verifyRuntime } from './runtime';

const checks: string[] = [];
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
  checks.push(message);
}
function canvas(width: number, height: number, color?: string) {
  const result = document.createElement('canvas');
  result.width = width;
  result.height = height;
  if (color) {
    const context = result.getContext('2d')!;
    context.fillStyle = color;
    context.fillRect(0, 0, width, height);
  }
  return result;
}
async function blob(source: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) =>
    source.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('encode failed'))),
      'image/png'
    )
  );
}
async function pixels(source: string | Blob) {
  const image = new Image();
  const url = typeof source === 'string' ? source : URL.createObjectURL(source);
  try {
    image.src = url;
    await image.decode();
    const target = canvas(image.naturalWidth, image.naturalHeight);
    const context = target.getContext('2d')!;
    context.drawImage(image, 0, 0);
    return {
      width: target.width,
      height: target.height,
      data: context.getImageData(0, 0, target.width, target.height).data,
    };
  } finally {
    if (typeof source !== 'string') URL.revokeObjectURL(url);
  }
}
async function main() {
  const font = new FontFace('ConsumerFixture', 'url(/fixture.ttf)');
  document.fonts.add(await font.load());
  const background = new File(
    [await blob(canvas(256, 192, '#ffffff'))],
    'background.png',
    { type: 'image/png' }
  );
  const logoCanvas = canvas(16, 8, '#ff0000');
  logoCanvas.getContext('2d')!.clearRect(8, 0, 8, 8);
  const logo = await blob(logoCanvas);
  const textOptions = {
    backgroundImage: { src: background },
    watermarkTexts: [
      {
        text: 'SDK',
        position: { position: Position.center },
        style: { fontName: 'ConsumerFixture', fontSize: 32, color: '#000000' },
      },
    ],
    saveFormat: ImageFormat.png,
  };
  const text = await Marker.markText(textOptions);
  const textPixels = await pixels(text.uri);
  assert(
    textPixels.data.some((value, i) => i % 4 !== 3 && value < 100),
    'File input and fixed-font text visibly alter pixels'
  );
  const repeated = await pixels((await Marker.markText(textOptions)).uri);
  assert(
    textPixels.data.every((value, i) => value === repeated.data[i]),
    'same-environment repeated text pixels are deterministic'
  );

  const markedLogo = await Marker.markImage({
    backgroundImage: { src: background },
    watermarkImages: [{ src: logo, alpha: 0.5, position: { X: 0, Y: 0 } }],
    saveFormat: ImageFormat.png,
  });
  const logoPixels = await pixels(markedLogo.uri);
  assert(
    logoPixels.data[0] === 255 && Math.abs(logoPixels.data[1]! - 127) <= 1,
    'Blob logo alpha blends with white'
  );
  assert(
    logoPixels.data[12 * 4 + 1] === 255,
    'transparent logo pixels preserve background'
  );
  const rotated = await Marker.markImage({
    backgroundImage: { src: await blob(canvas(40, 20)), rotate: 90 },
    watermarkImages: [{ src: logo, position: { position: Position.center } }],
    rotationCanvasMode: RotationCanvasMode.expand,
    saveFormat: ImageFormat.png,
  });
  const rotatedPixels = await pixels(rotated.uri);
  assert(
    rotatedPixels.width === 20 && rotatedPixels.height === 40,
    'background rotation expands to expected dimensions'
  );
  assert(
    rotatedPixels.data[3] === 0,
    'PNG output preserves background transparency'
  );

  const definition: WatermarkRecipeDefinition = {
    schemaVersion: 2,
    layers: [
      {
        id: 'label',
        type: 'text',
        text: 'SDK',
        style: { fontName: 'ConsumerFixture', fontSize: 32, color: '#000000' },
        position: { position: 'center' },
      },
    ],
    output: { saveFormat: 'png' },
  };
  const recipe = Marker.createRecipe(definition, { resultType: 'blob' });
  const recipeBlob: Blob = await recipe.apply({
    backgroundImage: { src: background },
  });
  assert(
    recipeBlob instanceof Blob && recipeBlob.type === 'image/png',
    'Recipe returns a PNG Blob'
  );
  const restored = Marker.importRecipe(
    JSON.parse(JSON.stringify(recipe.toJSON())),
    { resultType: 'blob' }
  );
  const roundTrip = await pixels(
    await restored.apply({ backgroundImage: { src: background } })
  );
  const first = await pixels(recipeBlob);
  assert(
    first.data.every((value, i) => value === roundTrip.data[i]),
    'Recipe JSON round trip preserves pixels'
  );
  const batch = await restored.applyMany([
    { backgroundImage: { src: background } },
    { backgroundImage: { src: logo } },
  ]);
  assert(
    batch.length === 2 && batch.every((item) => item.status === 'fulfilled'),
    'two-image batch succeeds in order'
  );
  const legacy = migrateWatermarkRecipe({
    schemaVersion: 1,
    watermarks: [{ type: 'text', text: 'legacy' }],
    saveFormat: 'png',
  });
  assert(
    legacy.schemaVersion === 2 && Boolean(legacy.layers[0]?.id),
    'legacy Recipe migrates with stable layer identity'
  );
  let invalidRejected = false;
  try {
    migrateWatermarkRecipe({ ...definition, output: { quality: 999 } });
  } catch {
    invalidRejected = true;
  }
  assert(invalidRejected, 'Core rendering validation survives migration');
  const controller = new ImageMarkerEditorController(definition);
  controller.addLayer({ type: 'text', text: 'second' });
  assert(
    controller.getState().recipe.layers.length === 2,
    'headless layer editing works'
  );
  controller.undo();
  assert(
    controller.getState().recipe.layers.length === 1,
    'headless undo works'
  );
  controller.redo();
  assert(
    controller.getState().recipe.layers.length === 2,
    'headless redo works'
  );
  const adapter = createWebEditorAdapter(128);
  const request = {
    recipe: definition,
    input: { backgroundImage: { src: background } },
  };
  const preview = await adapter.renderPreview(request);
  assert(
    (await pixels(preview.uri)).width === 128,
    'adapter preview respects maximum size'
  );
  const exported = await adapter.exportOriginal(request);
  assert(
    (await pixels(exported.final.uri)).width === 256,
    'adapter export preserves original dimensions'
  );
  controller.dispose();

  // Blocked fetch is deliberately not used to read data URLs or local file bytes.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new Error('CSP blocks fetch'));
  try {
    assert(
      (await Marker.getImageInfo(background)).width === 256,
      'File metadata requires no fetch'
    );
    assert(
      (await Marker.getImageInfo(text.uri)).format === 'png',
      'data URL metadata requires no fetch'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  const key = 'consumer-fixture-key-2026';
  const traceSource = await blob(canvas(256, 192, '#808080'));
  const marked = await Marker.embedInvisible({
    image: { src: traceSource },
    payload: 'recipient-42',
    key,
    saveFormat: ImageFormat.png,
  });
  const detection = await Marker.detectInvisible({
    image: { src: marked.uri },
    key,
    worker: { scriptUrl: workerUrl },
  });
  assert(
    detection.detected && detection.payload === 'recipient-42',
    `published Worker resource recovers locator offline (${JSON.stringify(
      detection
    )})`
  );
  const wrongKey = await Marker.detectInvisible({
    image: { src: marked.uri },
    key: 'incorrect-key-fixture',
    worker: { scriptUrl: workerUrl },
  });
  assert(!wrongKey.detected, 'wrong key does not authenticate locator');
  await verifyRuntime(checks);
  return { checks, workerUrl };
}

// The driver observes completion and fails on browser errors or rejected checks.
main().then(
  (result) => {
    document.querySelector('#result')!.textContent = JSON.stringify({
      ok: true,
      ...result,
    });
  },
  (error: unknown) => {
    document.querySelector('#result')!.textContent = JSON.stringify({
      ok: false,
      error: String(error),
      checks,
    });
  }
);
